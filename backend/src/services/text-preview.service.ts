import { ApiService } from '@services/api.service';
import { cleanHtml } from '@/utils/clean-html';

/**
 * Some records carry a text file that transforms to an empty document, because the
 * real content is an image. Framing those leaves a tall blank box on the object
 * view, so the object view asks here first and only frames what has text in it.
 */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 15000;

const apiService = new ApiService();
const cache = new Map<string, { hasText: Promise<boolean>; loadedAt: number }>();

export const hasReadableText = (url: string): Promise<boolean> => {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached.hasText;

  const hasText = apiService
    .get<string>({ url, responseType: 'text', timeout: TIMEOUT_MS })
    .then(res => cleanHtml(res.data) !== undefined)
    .catch(() => {
      cache.delete(url);
      return false;
    });

  cache.set(url, { hasText, loadedAt: Date.now() });
  return hasText;
};
