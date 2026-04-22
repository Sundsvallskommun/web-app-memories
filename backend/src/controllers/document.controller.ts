import { Controller, Get, Param, QueryParam, Res } from 'routing-controllers';
import { Response } from 'express';
import { ApiService } from '@services/api.service';
import { HttpException } from '@/exceptions/HttpException';
import { MUNICIPALITY_ID } from '@/config';
import { getApiBase } from '@/config/api-config';
import { logger } from '@utils/logger';
import {
  Audio,
  Document,
  Film,
  Photo,
  Publication,
  mapAudioToDocument,
  mapAudiosToDocuments,
  mapFilmToDocument,
  mapFilmsToDocuments,
  mapPhotoToDocument,
  mapPhotosToDocuments,
  mapPublicationToDocument,
  mapPublicationsToDocuments,
} from './document.mapper';

// ============================================================================
//  Server-side document cache
// ============================================================================
//
// The previous "fan out per page" approach can't deliver consistent pagination
// because each upstream source paginates independently — global page N pulls
// from each source's page N, which doesn't correspond to a single global slice.
// At high page numbers most sources are exhausted and the page renders sparse
// or empty (the "ghost pages" issue).
//
// Instead: fetch ALL records from each source ONCE, map them to Documents,
// cache by (source, query). All paging then slices from the cached list:
//   - per-page count is exactly `pageSize` (or less only on the very last page)
//   - `totalPages` is accurate
//   - filtering by type just slices a different cache key
//   - sort happens in memory, so cross-source sort is truly global
//
// Memory budget: ~28k records × ~1KB ≈ 30MB per query for the full unfiltered
// set. Cap at MAX_CACHE_KEYS entries with LRU eviction so worst-case memory
// stays bounded regardless of distinct queries.

type SourceKey = 'film' | 'publication' | 'photo' | 'object' | 'audio';

interface SourceCacheEntry {
  documents: Document[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes — archive doesn't change often
const MAX_CACHE_KEYS = 16; // ~4 sources × 4 distinct queries
const sourceCache = new Map<string, SourceCacheEntry>();

// In-flight request dedupe: if two requests arrive while a source is being
// warmed, both should `await` the same Promise rather than triggering two
// concurrent upstream-page-walks. Without this, the first user request and
// startup warming can race and double the cache-warm cost.
const inflight = new Map<string, Promise<Document[]>>();

const cacheKey = (source: SourceKey, query?: string): string => `${source}|${query || ''}`;

// ============================================================================
//  Sort
// ============================================================================
//
// `sortBy` is the frontend-facing column name; we sort the merged Document[]
// in memory rather than relying on each upstream source's per-source order.
// (Upstream native SQL queries can sort by raw DB column — but those names
// vary per source, and combining differently-sorted per-source lists is what
// caused the previous "clumped by type" UX bug.)

const sortDocuments = (docs: Document[], sortBy: string, sortDirection: string): void => {
  const direction = sortDirection.toLowerCase() === 'asc' ? 1 : -1;
  const cmp = (a: Document, b: Document): number => {
    if (sortBy === 'year') return (a.year || 0) - (b.year || 0);
    if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '', 'sv');
    if (sortBy === 'location') return (a.location || '').localeCompare(b.location || '', 'sv');
    return 0;
  };
  docs.sort((a, b) => direction * cmp(a, b));
};

// ============================================================================
//  Upstream pagination helpers
// ============================================================================

interface UpstreamMeta {
  page: number;
  limit: number;
  count: number;
  totalRecords: number;
  totalPages: number;
}

const UPSTREAM_PAGE_LIMIT = 500; // chunk size when warming the cache
const FETCH_CONCURRENCY = 8;

const buildUpstreamQuery = (
  query: string | undefined,
  page: number,
  limit: number,
  extra?: Record<string, string>,
): string => {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (extra) for (const [k, v] of Object.entries(extra)) params.set(k, v);
  return `?${params.toString()}`;
};

const evictOldestIfNeeded = (): void => {
  if (sourceCache.size <= MAX_CACHE_KEYS) return;
  let oldestKey: string | undefined;
  let oldestTs = Infinity;
  for (const [k, v] of sourceCache.entries()) {
    if (v.fetchedAt < oldestTs) {
      oldestTs = v.fetchedAt;
      oldestKey = k;
    }
  }
  if (oldestKey) sourceCache.delete(oldestKey);
};

// ============================================================================

@Controller()
export class DocumentController {
  private readonly apiService = new ApiService();

  /**
   * Fetch every page of an upstream collection, in parallel batches, and
   * concatenate. Returns the raw upstream items (not yet mapped to Document).
   */
  private async fetchAllPages<T>(buildUrl: (page: number) => string, itemsKey: string): Promise<T[]> {
    // First page tells us the total count.
    const first = await this.apiService.get<Record<string, unknown> & { _meta?: UpstreamMeta }>({ url: buildUrl(1) });
    const items: T[] = [...((first.data[itemsKey] as T[] | undefined) ?? [])];
    const totalPages = first.data._meta?.totalPages ?? 1;
    if (totalPages <= 1) return items;

    // Fetch the rest concurrently to keep cache-warm time tolerable.
    const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    for (let i = 0; i < remaining.length; i += FETCH_CONCURRENCY) {
      const batch = remaining.slice(i, i + FETCH_CONCURRENCY);
      const results = await Promise.all(
        batch.map(page => this.apiService.get<Record<string, unknown>>({ url: buildUrl(page) })),
      );
      for (const r of results) {
        const list = r.data[itemsKey] as T[] | undefined;
        if (list && list.length > 0) items.push(...list);
      }
    }
    return items;
  }

  /**
   * Returns the (possibly cached) full list of Documents for one source,
   * filtered by `query`. Populates the module-level cache on miss.
   *
   * Concurrent calls for the same key share a single in-flight Promise so we
   * never trigger two parallel cache warms.
   */
  private async fetchSource(source: SourceKey, query: string | undefined): Promise<Document[]> {
    const key = cacheKey(source, query);
    const cached = sourceCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.documents;

    const pending = inflight.get(key);
    if (pending) return pending;

    const promise = this.fetchSourceUncached(source, query)
      .then(docs => {
        sourceCache.set(key, { documents: docs, fetchedAt: Date.now() });
        evictOldestIfNeeded();
        logger.info(`Cached source=${source} query="${query || ''}" → ${docs.length} docs`);
        return docs;
      })
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, promise);
    return promise;
  }

  private async fetchSourceUncached(source: SourceKey, query: string | undefined): Promise<Document[]> {
    const base = getApiBase('memories');
    let docs: Document[] = [];
    try {
      switch (source) {
        case 'film': {
          const items = await this.fetchAllPages<Film>(
            page => `${base}/${MUNICIPALITY_ID}/films${buildUpstreamQuery(query, page, UPSTREAM_PAGE_LIMIT)}`,
            'films',
          );
          docs = mapFilmsToDocuments(items);
          break;
        }
        case 'publication': {
          const items = await this.fetchAllPages<Publication>(
            page => `${base}/${MUNICIPALITY_ID}/publications${buildUpstreamQuery(query, page, UPSTREAM_PAGE_LIMIT)}`,
            'publications',
          );
          docs = mapPublicationsToDocuments(items);
          break;
        }
        case 'photo': {
          const items = await this.fetchAllPages<Photo>(
            page =>
              `${base}/${MUNICIPALITY_ID}/photos${buildUpstreamQuery(query, page, UPSTREAM_PAGE_LIMIT, { objectType: 'Foto' })}`,
            'photos',
          );
          docs = mapPhotosToDocuments(items);
          break;
        }
        case 'object': {
          const items = await this.fetchAllPages<Photo>(
            page =>
              `${base}/${MUNICIPALITY_ID}/photos${buildUpstreamQuery(query, page, UPSTREAM_PAGE_LIMIT, { objectType: 'Föremål' })}`,
            'photos',
          );
          docs = mapPhotosToDocuments(items);
          break;
        }
        case 'audio': {
          const items = await this.fetchAllPages<Audio>(
            page => `${base}/${MUNICIPALITY_ID}/audios${buildUpstreamQuery(query, page, UPSTREAM_PAGE_LIMIT)}`,
            'audios',
          );
          docs = mapAudiosToDocuments(items);
          break;
        }
      }
    } catch (e) {
      logger.warn(`Failed to populate cache for source=${source} query=${query || ''}: ${(e as Error).message}`);
      // Don't poison the cache with a partial result — return empty and retry next request.
      return [];
    }
    return docs;
  }

  /**
   * Trigger a background warm of the empty-query cache for all four sources.
   * Call once at app start so the first user doesn't pay the warm cost.
   * Errors are swallowed so a slow upstream doesn't crash the server boot.
   */
  async warmCache(): Promise<void> {
    logger.info('Warming document cache (background)…');
    const t0 = Date.now();
    try {
      await Promise.all([
        this.fetchSource('film', undefined),
        this.fetchSource('publication', undefined),
        this.fetchSource('photo', undefined),
        this.fetchSource('object', undefined),
        this.fetchSource('audio', undefined),
      ]);
      logger.info(`Document cache warm complete in ${Date.now() - t0}ms`);
    } catch (e) {
      logger.warn(`Document cache warm failed: ${(e as Error).message}`);
    }
  }

  /**
   * Unified search across films, publications, photos and objects.
   *
   * All paging slices a fully-cached, fully-sorted in-memory list — accurate
   * `totalPages`, exactly `pageSize` items per page, type filter is just a
   * different cache slice.
   */
  @Get('/documents')
  async searchDocuments(
    @QueryParam('query') query: string,
    @QueryParam('page') page: number = 1,
    @QueryParam('pageSize') pageSize: number = 10,
    @QueryParam('type') type: string,
    @QueryParam('sortBy') sortBy: string,
    @QueryParam('sortDirection') sortDirection: string,
    @Res() response: Response,
  ) {
    const trimmedQuery = query?.trim() || undefined;

    // Always warm all four sources so chip counts stay accurate even when a
    // type filter is selected.
    const [films, publications, photos, objects, audios] = await Promise.all([
      this.fetchSource('film', trimmedQuery),
      this.fetchSource('publication', trimmedQuery),
      this.fetchSource('photo', trimmedQuery),
      this.fetchSource('object', trimmedQuery),
      this.fetchSource('audio', trimmedQuery),
    ]);

    // Type filter narrows which cache slice we paginate over.
    let docs: Document[];
    switch (type) {
      case 'Film':
        docs = [...films];
        break;
      case 'Publication':
        docs = [...publications];
        break;
      case 'Photo':
        docs = [...photos];
        break;
      case 'Object':
        docs = [...objects];
        break;
      case 'Audio':
        docs = [...audios];
        break;
      default:
        docs = [...films, ...publications, ...photos, ...objects, ...audios];
    }

    if (sortBy) sortDocuments(docs, sortBy, sortDirection || 'desc');

    const total = docs.length;
    const safePageSize = Math.max(1, pageSize);
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * safePageSize;
    const slice = docs.slice(start, start + safePageSize);

    return response.send({
      data: slice,
      total,
      totalPages,
      filmTotal: films.length,
      publicationTotal: publications.length,
      photoTotal: photos.length,
      objectTotal: objects.length,
      audioTotal: audios.length,
      page: safePage,
      pageSize: safePageSize,
      message: 'success',
    });
  }

  // Validate and extract the numeric suffix from a composite document ID like
  // "publ-123" or "film-456". Throws 400 if the suffix is not a positive integer.
  private extractNumericId(compositeId: string, prefix: string): string {
    const raw = compositeId.slice(prefix.length);
    if (!/^\d+$/.test(raw)) throw new HttpException(400, `Invalid document id: ${compositeId}`);
    return raw;
  }

  /**
   * Fetch a single document by composite id (film-N / publ-N / photo-N).
   */
  @Get('/documents/:id')
  async getDocumentById(@Param('id') id: string, @Res() response: Response) {
    const base = getApiBase('memories');

    if (id.startsWith('publ-')) {
      const publId = this.extractNumericId(id, 'publ-');
      const res = await this.apiService.get<Publication>({ url: `${base}/${MUNICIPALITY_ID}/publications/${publId}` });
      return response.send({ data: mapPublicationToDocument(res.data), message: 'success' });
    }

    if (id.startsWith('photo-')) {
      const photoId = this.extractNumericId(id, 'photo-');
      const res = await this.apiService.get<Photo>({ url: `${base}/${MUNICIPALITY_ID}/photos/${photoId}` });
      return response.send({ data: mapPhotoToDocument(res.data), message: 'success' });
    }

    if (id.startsWith('audio-')) {
      const audioId = this.extractNumericId(id, 'audio-');
      const res = await this.apiService.get<Audio>({ url: `${base}/${MUNICIPALITY_ID}/audios/${audioId}` });
      return response.send({ data: mapAudioToDocument(res.data), message: 'success' });
    }

    const filmId = this.extractNumericId(id.startsWith('film-') ? id : `film-${id}`, 'film-');
    const res = await this.apiService.get<Film>({ url: `${base}/${MUNICIPALITY_ID}/films/${filmId}` });
    return response.send({ data: mapFilmToDocument(res.data), message: 'success' });
  }

  /**
   * Pipe a file from the upstream samba share through this proxy without
   * buffering. Important for the Film endpoint where individual records can
   * be 40+ MB AVI files — buffering them in memory would OOM the proxy in
   * the same way Logbook OOMs the upstream when it wraps the response.
   */
  @Get('/documents/:id/file')
  async getDocumentFile(@Param('id') id: string, @QueryParam('variant') variant: string, @Res() response: Response) {
    const base = getApiBase('memories');

    // Default to `large` for image-bearing sources; films have no variants on the upstream API.
    const defaultVariant = id.startsWith('publ-') || id.startsWith('photo-') ? 'large' : '';
    const v = variant || defaultVariant;
    let url: string;
    if (id.startsWith('publ-')) {
      url = `${base}/${MUNICIPALITY_ID}/publications/${this.extractNumericId(id, 'publ-')}/file?variant=${v}`;
    } else if (id.startsWith('photo-')) {
      url = `${base}/${MUNICIPALITY_ID}/photos/${this.extractNumericId(id, 'photo-')}/file?variant=${v}`;
    } else if (id.startsWith('audio-')) {
      url = `${base}/${MUNICIPALITY_ID}/audios/${this.extractNumericId(id, 'audio-')}/file`;
    } else {
      url = `${base}/${MUNICIPALITY_ID}/films/${this.extractNumericId(id.startsWith('film-') ? id : `film-${id}`, 'film-')}/file`;
    }

    const upstream = await this.apiService.getRaw({ url, responseType: 'stream' });
    // Forward the headers that drive download/inline behaviour. Don't set
    // Content-Type ourselves — upstream knows the right MIME for film vs jpeg.
    for (const header of ['content-type', 'content-disposition', 'content-length']) {
      const value = upstream.headers[header];
      if (value) response.setHeader(header, value as string);
    }
    (upstream.data as NodeJS.ReadableStream).pipe(response);
    return response;
  }
}
