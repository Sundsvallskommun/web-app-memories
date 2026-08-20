import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosHeaders, AxiosResponseHeaders } from 'axios';
import { randomUUID } from 'crypto';
import { apiURL } from '@/config/api-config';
import { CLIENT_KEY } from '@/config';
import { getApiTokenService } from './api-token.service';
import { HttpException } from '@/exceptions/HttpException';
import { logger } from '@utils/logger';

export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
}

// ============================================================================
//  Throttling
// ============================================================================
//
// The API gateway enforces a per-minute request quota per client key and answers
// with `429` + `{"code":"900803","message":"Message throttled out"}` once it is
// spent. Walking a large collection (publications is 20k+ records) costs more
// requests than one window allows, so a cache warm *will* hit this and simply
// has to wait for the window to roll over.
//
// `Retry-After` may be delta-seconds or an HTTP-date per RFC 9110 — this gateway
// sends the latter (`Thu, 20 Aug 2026 13:35:00 GMT`), naming the instant the
// next window opens, so parse both rather than assuming a number.

const MAX_THROTTLE_RETRIES = 3;
const MAX_THROTTLE_WAIT_MS = 90_000; // never park a single request longer than this
const DEFAULT_THROTTLE_WAIT_MS = 15_000; // when the gateway tells us nothing useful

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/** How long to wait before retrying, from `Retry-After` in either RFC 9110 form. */
const throttleDelayMs = (headers: AxiosResponseHeaders | undefined): number => {
  const raw = String(headers?.['retry-after'] ?? '').trim();
  const ms = /^\d+$/.test(raw)
    ? Number(raw) * 1000 // delta-seconds
    : Date.parse(raw) - Date.now(); // HTTP-date (NaN if absent/unparseable)

  // A second of slack so we land inside the new window, not on its boundary.
  const delay = ms > 0 ? ms + 1000 : DEFAULT_THROTTLE_WAIT_MS;
  return Math.min(delay, MAX_THROTTLE_WAIT_MS);
};

/**
 * Best-effort human-readable reason from an upstream error body. Different
 * services answer in different shapes — RFC 7807 (`detail`), dept44 constraint
 * violations (`title`), gateway throttling (`message`) — and collapsing all of
 * them to "Internal server error" hides the actual cause.
 */
const errorDetail = (data: unknown): string => {
  if (!data || typeof data !== 'object') return 'Internal server error';
  const body = data as Record<string, unknown>;
  for (const field of ['detail', 'message', 'description', 'title']) {
    const value = body[field];
    if (typeof value === 'string' && value) return value;
  }
  return 'Internal server error';
};

export class ApiService {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create();

    this.instance.interceptors.request.use(async request => {
      // Don't add token for the token endpoint itself
      if (request.url?.includes('/token')) return request;

      const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Request-Id': randomUUID(),
      };

      // Only fetch OAuth token if credentials are configured
      if (CLIENT_KEY) {
        const token = await getApiTokenService().getToken();
        defaultHeaders['Authorization'] = `Bearer ${token}`;
      } else {
        logger.warn('No CLIENT_KEY configured — calling API without OAuth token (dev mode)');
      }

      request.headers = AxiosHeaders.from({
        ...defaultHeaders,
        ...request.headers,
      });

      return request;
    });
  }

  private async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const preparedConfig: AxiosRequestConfig = {
      ...config,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      url: apiURL(config.url || ''),
    };

    for (let attempt = 0; ; attempt++) {
      try {
        const res = await this.instance(preparedConfig);
        return { data: res.data, message: 'success' };
      } catch (error: unknown) {
        if (!axios.isAxiosError(error)) {
          throw new HttpException(500, 'Internal server error');
        }

        const axiosError = error as AxiosError;
        const status = axiosError.response?.status ?? 500;
        const detail = errorDetail(axiosError.response?.data);

        // Quota exhausted — wait for the window to roll over and try again.
        if (status === 429 && attempt < MAX_THROTTLE_RETRIES) {
          const delay = throttleDelayMs(axiosError.response?.headers as AxiosResponseHeaders);
          logger.warn(
            `Throttled on ${config.method} ${config.url} — retrying in ${Math.round(delay / 1000)}s ` +
              `(attempt ${attempt + 1}/${MAX_THROTTLE_RETRIES}): ${detail}`,
          );
          await sleep(delay);
          continue;
        }

        logger.error(`API request failed: ${config.method} ${config.url} => ${status}: ${detail}`);

        if (status === 404) {
          throw new HttpException(404, 'Not found');
        }
        throw new HttpException(status, detail);
      }
    }
  }

  public async get<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'GET' });
  }

  /**
   * Issue a GET that returns the raw axios response so callers can forward
   * headers (Content-Type, Content-Disposition) and pipe the body stream.
   */
  public async getRaw(config: AxiosRequestConfig) {
    const preparedConfig: AxiosRequestConfig = {
      ...config,
      method: 'GET',
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      url: apiURL(config.url || ''),
    };
    try {
      return await this.instance(preparedConfig);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status ?? 500;
        const detail = errorDetail(error.response?.data);
        logger.error(`API stream request failed: GET ${config.url} => ${status}: ${detail}`);
        throw new HttpException(status === 404 ? 404 : status, status === 404 ? 'Not found' : detail);
      }
      throw new HttpException(500, 'Internal server error');
    }
  }

  public async post<T, D = unknown>(config: AxiosRequestConfig<D>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'POST' });
  }

  public async put<T, D = unknown>(config: AxiosRequestConfig<D>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT' });
  }

  public async delete<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE' });
  }
}
