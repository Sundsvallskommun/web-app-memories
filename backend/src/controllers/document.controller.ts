import { Controller, Get, HeaderParam, Param, QueryParam, Res } from 'routing-controllers';
import { Response } from 'express';
import { ApiService } from '@services/api.service';
import { HttpException } from '@/exceptions/HttpException';
import { MUNICIPALITY_ID } from '@/config';
import { getApiBase } from '@/config/api-config';
import {
  Audio,
  CombinedObjectResponse,
  DOCUMENT_OBJECT_TYPES,
  Film,
  Photo,
  Publication,
  Text,
  TypeCount,
  mapAudioToDocument,
  mapCombinedObjectsToDocuments,
  mapFilmToDocument,
  mapPhotoToDocument,
  mapPublicationToDocument,
  mapTextToDocument,
} from './document.mapper';

// ============================================================================
//  Unified search
// ============================================================================
//
// Search is one upstream call to /objects, which spans every object type and
// register, sorts and paginates globally, and returns per-type match counts.
//
// This replaces a six-way fan-out that page-walked each collection separately
// and held the whole corpus in memory to sort and slice it. That approach cost
// ~36 upstream requests per distinct query against a per-minute quota, and it
// could only produce accurate totals by fetching everything first.

/** Upstream sort fields. Anything else is dropped rather than substituted. */
const SORTABLE = new Set(['relevance', 'objectKey', 'title', 'year', 'objectType']);

const toUpstreamSort = (sortBy: string | undefined): string | undefined =>
  sortBy && SORTABLE.has(sortBy) ? sortBy : undefined;

/**
 * Relevance is scored with the best match lowest, so ascending is best first.
 * Sending DESC alongside it returns the worst matches first.
 */
const toUpstreamDirection = (sortBy: string, sortDirection: string | undefined): string => {
  if (sortBy === 'relevance') return 'ASC';
  return sortDirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
};

/**
 * The frontend's type names, mapped back to the upstream objectType values that
 * /objects filters on. Foto and Föremål share one upstream collection.
 */
const DOCUMENT_TYPE_TO_OBJECT_TYPE: Record<string, string> = {
  Photo: 'Foto',
  Object: 'Föremål',
  Film: 'Film',
  Audio: 'Ljud',
  Text: 'Text',
  Publication: 'Publikation',
  Person: 'Person',
  Seaman: 'Sjöman',
  LegalEntity: 'Juridisk person',
};

const countFor = (typeCounts: TypeCount[] | undefined, objectType: string): number =>
  typeCounts?.find(c => c.objectType === objectType)?.count ?? 0;

const FILE_CACHE_CONTROL = 'public, max-age=86400';

// ============================================================================

@Controller()
export class DocumentController {
  private readonly apiService = new ApiService();

  /**
   * Unified search across every document type.
   *
   * Sorting, pagination and the per-type counts all come from upstream, so a
   * page of results costs exactly one request no matter how many types match.
   */
  @Get('/documents')
  async searchDocuments(
    @QueryParam('query') query: string,
    @QueryParam('page') page: number = 1,
    @QueryParam('pageSize') pageSize: number = 10,
    @QueryParam('type') type: string,
    @QueryParam('sortBy') sortBy: string,
    @QueryParam('sortDirection') sortDirection: string,
    @QueryParam('yearFrom') yearFrom: number,
    @QueryParam('yearTo') yearTo: number,
    @QueryParam('location') location: string,
    @QueryParam('creator') creator: string,
    @Res() response: Response,
  ) {
    const safePageSize = Math.max(1, pageSize);
    const safePage = Math.max(1, page);

    const params = new URLSearchParams();
    params.set('page', String(safePage));
    params.set('limit', String(safePageSize));
    const upstreamSort = toUpstreamSort(sortBy);
    if (upstreamSort) {
      params.set('sortBy', upstreamSort);
      params.set('sortDirection', toUpstreamDirection(upstreamSort, sortDirection));
    }

    const trimmedQuery = query?.trim();
    if (trimmedQuery) params.set('query', trimmedQuery);
    if (yearFrom) params.set('yearFrom', String(yearFrom));
    if (yearTo) params.set('yearTo', String(yearTo));
    if (location?.trim()) params.set('location', location.trim());
    if (creator?.trim()) params.set('creator', creator.trim());

    const requestedObjectTypes = [
      ...new Set(
        (type ?? '')
          .split(',')
          .map(name => DOCUMENT_TYPE_TO_OBJECT_TYPE[name.trim()])
          .filter(Boolean),
      ),
    ];

    for (const objectType of requestedObjectTypes.length > 0 ? requestedObjectTypes : DOCUMENT_OBJECT_TYPES) {
      params.append('objectType', objectType);
    }

    const url = `${getApiBase('memories')}/${MUNICIPALITY_ID}/objects?${params.toString()}`;
    const res = await this.apiService.get<CombinedObjectResponse>({ url });
    const { objects = [], typeCounts, _meta } = res.data;

    return response.send({
      data: mapCombinedObjectsToDocuments(objects),
      total: _meta?.totalRecords ?? objects.length,
      totalPages: _meta?.totalPages ?? 1,
      filmTotal: countFor(typeCounts, 'Film'),
      publicationTotal: countFor(typeCounts, 'Publikation'),
      photoTotal: countFor(typeCounts, 'Foto'),
      objectTotal: countFor(typeCounts, 'Föremål'),
      audioTotal: countFor(typeCounts, 'Ljud'),
      textTotal: countFor(typeCounts, 'Text'),
      page: _meta?.page ?? safePage,
      pageSize: _meta?.limit ?? safePageSize,
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

    // Register records (person-, jurpers-, sjoman-) are searchable through
    // /objects but have no document representation, so there is nothing to
    // render. Answer 404 rather than falling through to the film branch, which
    // would report the id as malformed.
    if (/^[a-z]+-/.test(id) && !id.startsWith('film-')) {
      throw new HttpException(404, 'Not found');
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
    response.setHeader('Cache-Control', FILE_CACHE_CONTROL);
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
    response.setHeader('Cache-Control', FILE_CACHE_CONTROL);
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
    response.setHeader('Cache-Control', FILE_CACHE_CONTROL);
    response.status(upstream.status);
    (upstream.data as NodeJS.ReadableStream).pipe(response);
    return response;
  }
}
