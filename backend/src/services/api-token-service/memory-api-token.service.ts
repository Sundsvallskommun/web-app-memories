import { IApiTokenService, Token } from '@interfaces/api-token.interface';
import { fetchApiToken } from '@utils/fetchToken';
import { logger } from '@utils/logger';

let cachedToken = '';
let tokenExpires = 0;

export class MemoryApiTokenService implements IApiTokenService {
  public async getToken(): Promise<string> {
    if (Date.now() >= tokenExpires) {
      logger.info('[MEMORY] Fetching new OAuth API token');
      await this.fetchAndSetToken();
    }
    return cachedToken;
  }

  private async fetchAndSetToken(): Promise<void> {
    const token: Token = await fetchApiToken();
    cachedToken = token.access_token;
    // Refresh 10 seconds before actual expiry
    tokenExpires = Date.now() + (token.expires_in * 1000 - 10000);
  }
}
