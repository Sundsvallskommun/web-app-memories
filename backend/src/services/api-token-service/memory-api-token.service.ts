import { IApiTokenService, Token } from '@interfaces/api-token.interface';
import { fetchApiToken } from '@utils/fetchToken';
import { logger } from '@utils/logger';

let cachedToken = '';
let tokenExpires = 0;

let inflight: Promise<void> | null = null;

export class MemoryApiTokenService implements IApiTokenService {
  public async getToken(): Promise<string> {
    if (Date.now() >= tokenExpires) {
      inflight ??= this.fetchAndSetToken().finally(() => {
        inflight = null;
      });
      await inflight;
    }
    return cachedToken;
  }

  private async fetchAndSetToken(): Promise<void> {
    logger.info('[MEMORY] Fetching new OAuth API token');
    const token: Token = await fetchApiToken();
    cachedToken = token.access_token;
    // Refresh 10 seconds before actual expiry
    tokenExpires = Date.now() + (token.expires_in * 1000 - 10000);
  }
}
