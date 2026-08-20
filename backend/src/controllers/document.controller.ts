import { Controller, Get, HeaderParam, Param, QueryParam, Res } from 'routing-controllers';
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
  Text,
  mapAudioToDocument,
  mapAudiosToDocuments,
  mapFilmToDocument,
  mapFilmsToDocuments,
  mapPhotoToDocument,
  mapPhotosToDocuments,
  mapPublicationToDocument,
  mapPublicationsToDocuments,
  mapTextToDocument,
  mapTextsToDocuments,
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

type SourceKey = 'film' | 'publication' | 'photo' | 'object' | 'audio' | 'text';

interface SourceCacheEntry {
  documents: Document[];
  fetchedAt: number;
  /** True when some upstream pages were lost (throttling) and the set is incomplete. */
  partial: boolean;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes — archive doesn't change often
// A partial set is still worth serving — stale-but-something beats an empty grid —
// but it should be refreshed far sooner than a complete one.
const PARTIAL_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
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

// 1000 is the gateway's hard ceiling ("Page limit cannot be greater than 1000").
// Use all of it: the per-minute request quota, not payload size, is the binding
// constraint, so halving the page count halves the cost of a full warm.
const UPSTREAM_PAGE_LIMIT = 1000;
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
   * concatenate. Returns the raw upstream items (not yet mapped to Document)
   * alongside the count of pages that could not be retrieved.
   *
   * A single failed page must not cost the whole collection: publications is
   * 20k+ records across ~21 pages, and losing all of it because page 17 was
   * throttled leaves the UI empty. Failures are tolerated per page and reported
   * so the caller can shorten the cache lifetime instead.
   */
  private async fetchAllPages<T>(
    buildUrl: (page: number) => string,
    itemsKey: string,
  ): Promise<{ items: T[]; missingPages: number }> {
    // First page tells us the total count. This one is not optional — without it
    // we don't know how far the collection runs.
    const first = await this.apiService.get<Record<string, unknown> & { _meta?: UpstreamMeta }>({ url: buildUrl(1) });
    const items: T[] = [...((first.data[itemsKey] as T[] | undefined) ?? [])];
    const totalPages = first.data._meta?.totalPages ?? 1;
    if (totalPages <= 1) return { items, missingPages: 0 };

    // Fetch the rest concurrently to keep cache-warm time tolerable.
    let missingPages = 0;
    const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    for (let i = 0; i < remaining.length; i += FETCH_CONCURRENCY) {
      const batch = remaining.slice(i, i + FETCH_CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(page => this.apiService.get<Record<string, unknown>>({ url: buildUrl(page) })),
      );
      for (const r of results) {
        if (r.status === 'rejected') {
          missingPages++;
          continue;
        }
        const list = r.value.data[itemsKey] as T[] | undefined;
        if (list && list.length > 0) items.push(...list);
      }
    }
    return { items, missingPages };
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
    if (cached) {
      const ttl = cached.partial ? PARTIAL_CACHE_TTL_MS : CACHE_TTL_MS;
      if (Date.now() - cached.fetchedAt < ttl) return cached.documents;
    }

    const pending = inflight.get(key);
    if (pending) return pending;

    const promise = this.fetchSourceUncached(source, query)
      .then(({ documents, partial }) => {
        // Never let an incomplete refresh shrink what we already serve.
        const keepOld = partial && documents.length < (cached?.documents.length ?? 0);
        const entry: SourceCacheEntry = keepOld
          ? { ...cached!, fetchedAt: Date.now(), partial: true }
          : { documents, fetchedAt: Date.now(), partial };

        sourceCache.set(key, entry);
        evictOldestIfNeeded();
        logger.info(
          `Cached source=${source} query="${query || ''}" → ${entry.documents.length} docs` +
            `${entry.partial ? ' (partial)' : ''}${keepOld ? ' — kept previous, refresh was short' : ''}`,
        );
        return entry.documents;
      })
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, promise);
    return promise;
  }

  /**
   * Walk one upstream collection and map it to Documents. `collection` doubles
   * as the URL segment and the key the items arrive under (`photos`, `texts`, …).
   */
  private async collect<T>(
    collection: string,
    query: string | undefined,
    extra: Record<string, string> | undefined,
    map: (items: T[]) => Document[],
  ): Promise<{ documents: Document[]; missingPages: number }> {
    const url = (page: number): string =>
      `${getApiBase('memories')}/${MUNICIPALITY_ID}/${collection}` +
      buildUpstreamQuery(query, page, UPSTREAM_PAGE_LIMIT, extra);

    const { items, missingPages } = await this.fetchAllPages<T>(url, collection);
    return { documents: map(items), missingPages };
  }

  private async fetchSourceUncached(
    source: SourceKey,
    query: string | undefined,
  ): Promise<{ documents: Document[]; partial: boolean }> {
    // `photo` and `object` are the same endpoint split by objectType.
    const collect = (): Promise<{ documents: Document[]; missingPages: number }> => {
      switch (source) {
        case 'film':
          return this.collect<Film>('films', query, undefined, mapFilmsToDocuments);
        case 'publication':
          return this.collect<Publication>('publications', query, undefined, mapPublicationsToDocuments);
        case 'photo':
          return this.collect<Photo>('photos', query, { objectType: 'Foto' }, mapPhotosToDocuments);
        case 'object':
          return this.collect<Photo>('photos', query, { objectType: 'Föremål' }, mapPhotosToDocuments);
        case 'audio':
          return this.collect<Audio>('audios', query, undefined, mapAudiosToDocuments);
        case 'text':
          return this.collect<Text>('texts', query, undefined, mapTextsToDocuments);
      }
    };

    try {
      const { documents, missingPages } = await collect();
      if (missingPages > 0) {
        logger.warn(
          `Incomplete fetch for source=${source} query="${query || ''}": ${missingPages} page(s) unavailable — ` +
            `serving ${documents.length} docs, retrying in ${PARTIAL_CACHE_TTL_MS / 60000} min`,
        );
      }
      return { documents, partial: missingPages > 0 };
    } catch (e) {
      // Only page 1 reaches here — later pages degrade to `missingPages` instead.
      // Without page 1 there is nothing to serve, so mark partial to retry soon.
      logger.warn(`Failed to populate cache for source=${source} query=${query || ''}: ${(e as Error).message}`);
      return { documents: [], partial: true };
    }
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
        this.fetchSource('text', undefined),
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

    // Always warm all sources so chip counts stay accurate even when a
    // type filter is selected.
    const [films, publications, photos, objects, audios, texts] = await Promise.all([
      this.fetchSource('film', trimmedQuery),
      this.fetchSource('publication', trimmedQuery),
      this.fetchSource('photo', trimmedQuery),
      this.fetchSource('object', trimmedQuery),
      this.fetchSource('audio', trimmedQuery),
      this.fetchSource('text', trimmedQuery),
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
      case 'Text':
        docs = [...texts];
        break;
      default:
        docs = [...films, ...publications, ...photos, ...objects, ...audios, ...texts];
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
      textTotal: texts.length,
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

    if (id.startsWith('text-')) {
      const textId = this.extractNumericId(id, 'text-');
      const res = await this.apiService.get<Text>({ url: `${base}/${MUNICIPALITY_ID}/texts/${textId}` });
      return response.send({ data: mapTextToDocument(res.data), message: 'success' });
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
  async getDocumentFile(
    @Param('id') id: string,
    @QueryParam('variant') variant: string,
    @HeaderParam('range') range: string,
    @Res() response: Response,
  ) {
    const base = getApiBase('memories');

    // Default to `large` for image-bearing sources; films have no variants on the upstream API.
    const defaultVariant = id.startsWith('publ-') || id.startsWith('photo-') || id.startsWith('text-') ? 'large' : '';
    const v = variant || defaultVariant;
    let url: string;
    if (id.startsWith('publ-')) {
      url = `${base}/${MUNICIPALITY_ID}/publications/${this.extractNumericId(id, 'publ-')}/file?variant=${v}`;
    } else if (id.startsWith('photo-')) {
      url = `${base}/${MUNICIPALITY_ID}/photos/${this.extractNumericId(id, 'photo-')}/file?variant=${v}`;
    } else if (id.startsWith('text-')) {
      url = `${base}/${MUNICIPALITY_ID}/texts/${this.extractNumericId(id, 'text-')}/file?variant=${v}`;
    } else if (id.startsWith('audio-')) {
      url = `${base}/${MUNICIPALITY_ID}/audios/${this.extractNumericId(id, 'audio-')}/file`;
    } else {
      url = `${base}/${MUNICIPALITY_ID}/films/${this.extractNumericId(id.startsWith('film-') ? id : `film-${id}`, 'film-')}/file`;
    }

    // Forward the browser's Range header so upstream can respond with a 206
    // partial-content slice. Without this, <audio>/<video> elements can't
    // compute duration or seek — they just stream until buffering catches up
    // and the scrubber shows "buffered so far" instead of the clip length.
    const upstream = await this.apiService.getRaw({
      url,
      responseType: 'stream',
      headers: range ? { Range: range } : undefined,
      // Accept 206 Partial Content in addition to 200.
      validateStatus: status => status >= 200 && status < 300,
    });

    // Forward the headers that drive download / seek / inline playback.
    // Don't set Content-Type ourselves — upstream knows the right MIME.
    for (const header of ['content-type', 'content-disposition', 'content-length', 'accept-ranges', 'content-range']) {
      const value = upstream.headers[header];
      if (value) response.setHeader(header, value as string);
    }
    // Preserve 206 when upstream serves a partial response.
    response.status(upstream.status);
    (upstream.data as NodeJS.ReadableStream).pipe(response);
    return response;
  }

  /**
   * Pipe an extra media-file image (Text / TEXT_MULTI) through the proxy. Only
   * valid for `text-` documents; the upstream serves these from a dedicated
   * per-media endpoint (`/texts/{id}/media/{mediaId}/file`) added in memories 3.4.
   */
  @Get('/documents/:id/media/:mediaId/file')
  async getDocumentMediaFile(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @QueryParam('variant') variant: string,
    @Res() response: Response,
  ) {
    if (!id.startsWith('text-')) {
      throw new HttpException(400, `No media files available for document id: ${id}`);
    }
    if (!/^\d+$/.test(mediaId)) {
      throw new HttpException(400, `Invalid media file id: ${mediaId}`);
    }

    const base = getApiBase('memories');
    const textId = this.extractNumericId(id, 'text-');
    const v = variant || 'large';
    const url = `${base}/${MUNICIPALITY_ID}/texts/${textId}/media/${mediaId}/file?variant=${v}`;

    const upstream = await this.apiService.getRaw({
      url,
      responseType: 'stream',
      validateStatus: status => status >= 200 && status < 300,
    });

    // Don't set Content-Type ourselves — upstream knows the right MIME.
    for (const header of ['content-type', 'content-disposition', 'content-length']) {
      const value = upstream.headers[header];
      if (value) response.setHeader(header, value as string);
    }
    response.status(upstream.status);
    (upstream.data as NodeJS.ReadableStream).pipe(response);
    return response;
  }

  /**
   * Inline-playback stream for audio and film. Proxies to upstream's dedicated
   * `/stream` endpoint (Memories 3.2+) which serves `Content-Disposition: inline`
   * and `Accept-Ranges: bytes`, honouring the browser's `Range` header so the
   * <audio>/<video> element can compute duration and seek.
   *
   * Separate from `/file` because audio/film `/file` still returns an
   * `attachment` disposition for downloads, whereas `/stream` enables
   * seekable inline playback. (Photos and publications get `inline`
   * on `/file` directly so the browser can render them in-page.)
   */
  @Get('/documents/:id/stream')
  async streamDocument(@Param('id') id: string, @HeaderParam('range') range: string, @Res() response: Response) {
    const base = getApiBase('memories');
    let url: string;
    if (id.startsWith('audio-')) {
      url = `${base}/${MUNICIPALITY_ID}/audios/${this.extractNumericId(id, 'audio-')}/stream`;
    } else if (id.startsWith('film-')) {
      url = `${base}/${MUNICIPALITY_ID}/films/${this.extractNumericId(id, 'film-')}/stream`;
    } else {
      throw new HttpException(400, `No stream available for document id: ${id}`);
    }

    const upstream = await this.apiService.getRaw({
      url,
      responseType: 'stream',
      headers: range ? { Range: range } : undefined,
      validateStatus: status => status >= 200 && status < 300,
    });

    for (const header of ['content-type', 'content-disposition', 'content-length', 'accept-ranges', 'content-range']) {
      const value = upstream.headers[header];
      if (value) response.setHeader(header, value as string);
    }
    response.status(upstream.status);
    (upstream.data as NodeJS.ReadableStream).pipe(response);
    return response;
  }
}
