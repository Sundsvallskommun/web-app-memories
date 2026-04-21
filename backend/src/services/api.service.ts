import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosHeaders } from 'axios';
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

    try {
      const res = await this.instance(preparedConfig);
      return { data: res.data, message: 'success' };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status ?? 500;
        const detail = (axiosError.response?.data as Record<string, string>)?.detail ?? 'Internal server error';

        logger.error(`API request failed: ${config.method} ${config.url} => ${status}: ${detail}`);

        if (status === 404) {
          throw new HttpException(404, 'Not found');
        }
        throw new HttpException(status, detail);
      }
      throw new HttpException(500, 'Internal server error');
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
        const detail = (error.response?.data as Record<string, string>)?.detail ?? 'Internal server error';
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
