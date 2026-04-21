import { IApiTokenService } from '@interfaces/api-token.interface';
import { MemoryApiTokenService } from './api-token-service/memory-api-token.service';

let instance: IApiTokenService;

export function getApiTokenService(): IApiTokenService {
  if (!instance) {
    instance = new MemoryApiTokenService();
  }
  return instance;
}
