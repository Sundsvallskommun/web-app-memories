export interface Film {
  filmId: number;
  filename: string | null;
  objectFilePath: string | null;
  objectType: string | null;
  date: string | null;
  documentTitle: string | null;
  topographyId: number | null;
  locationText: string | null;
  location: string | null;
  organizationId: number | null;
  subEntityId: number | null;
  unitId: number | null;
  comment: string | null;
  filmMimeType: string | null;
  nodeId: number | null;
  options: number | null;
  deletedDate: string | null;
}

export interface Publication {
  publicationId: number;
  filename: string | null;
  publicationType: string | null;
  date: string | null;
  periodicalTitle: string | null;
  issueNumber: string | null;
  pageNumber: string | null;
  publisherLocation: string | null;
  documentTitle: string | null;
  locationText: string | null;
  location: string | null;
  comment: string | null;
  thumbnailFilename: string | null;
  largeImageFilename: string | null;
  ocrFilename: string | null;
  xmltext: string | null;
}

export interface Photo {
  photoId: number;
  filename: string | null;
  documentTitle: string | null;
  subjectKeyword: string | null;
  comment: string | null;
  earliest: string | null;
  latest: string | null;
  observationDate: string | null;
  locationText: string | null;
  location: string | null;
  objectType: string | null;
  colorMode: string | null;
  material: string | null;
  technique: string | null;
  height: string | null;
  width: string | null;
  thumbnailFilename: string | null;
  largeImageFilename: string | null;
  rights: string | null;
  accessionNumber: string | null;
  referenceCode: string | null;
}

export interface DocumentFile {
  filename: string;
  format: string;
  size: string;
  variant?: string;
}

export interface PublicationCitation {
  title?: string;
  number?: string;
  page?: string;
}

export interface Document {
  id: string;
  title: string;
  type: string;
  // year=0 → unknown (out-of-range placeholder collapsed in parseYear)
  year: number;
  // Free-text place name from `*locationText` columns. May be empty.
  ort?: string;
  // Resolved place name from TOPOGRAFI (preferred over `ort` when present).
  plats?: string;
  // Combined display string ("plats — ort" or whichever is set). Kept for the list view
  // and any old consumers that just want one string.
  location: string;
  creator: string;
  description: string;
  // Photo identifier as used in the legacy archive (referenceCode or accessionNumber).
  accnr?: string;
  // Archive collection name (e.g. "Otto Sjögrens arkiv"). Pending upstream column.
  archiveCollection?: string;
  // Holding institution (e.g. "Sundsvalls museum"). Pending upstream column.
  institution?: string;
  // For Publications: the periodical/source citation.
  publication?: PublicationCitation;
  // Legacy free-text source line (e.g. "Östersunds-Posten nr 12, s. 3"). Will be derived
  // from `publication` when set; left for back-compat.
  source?: string;
  archiveReference?: string;
  files?: DocumentFile[];
}

// The upstream DB uses literal "3000" (and similar future-year strings) as a
// placeholder for "unknown date". Don't surface those as real years — they look
// like garbage to the user. Anything outside a sane historical window is treated
// as missing.
const MIN_VALID_YEAR = 1500;
const MAX_VALID_YEAR = new Date().getFullYear();

const parseYear = (datum: string | null): number => {
  if (!datum) return 0;
  const match = datum.match(/(\d{4})/);
  if (!match) return 0;
  const y = parseInt(match[1], 10);
  if (y < MIN_VALID_YEAR || y > MAX_VALID_YEAR) return 0;
  return y;
};

const buildFilmFiles = (film: Film): DocumentFile[] | undefined => {
  const path = film.objectFilePath;
  if (!path) return undefined;
  const filename = path.replace(/\\/g, '/').split('/').pop() || path;
  return [
    {
      filename,
      format: film.filmMimeType || 'unknown',
      size: '',
    },
  ];
};

// Helper: prefer the resolved TOPOGRAFI place name over the legacy free-text fallbacks.
const pickLocation = (...candidates: (string | null | undefined)[]): string => {
  for (const c of candidates) {
    if (c && c.trim().length > 0) return c;
  }
  return '';
};

const buildPublicationFiles = (pub: Publication): DocumentFile[] | undefined => {
  const files: DocumentFile[] = [];
  if (pub.largeImageFilename)
    files.push({ filename: pub.largeImageFilename, format: 'Stor bild', size: '', variant: 'large' });
  if (pub.thumbnailFilename)
    files.push({ filename: pub.thumbnailFilename, format: 'Miniatyr', size: '', variant: 'thumbnail' });
  if (pub.ocrFilename) files.push({ filename: pub.ocrFilename, format: 'Text/XML', size: '', variant: 'text' });
  return files.length > 0 ? files : undefined;
};

const buildPhotoFiles = (photo: Photo): DocumentFile[] | undefined => {
  const files: DocumentFile[] = [];
  if (photo.largeImageFilename)
    files.push({ filename: photo.largeImageFilename, format: 'Stor bild', size: '', variant: 'large' });
  if (photo.thumbnailFilename)
    files.push({ filename: photo.thumbnailFilename, format: 'Miniatyr', size: '', variant: 'thumbnail' });
  return files.length > 0 ? files : undefined;
};

const photoYear = (photo: Photo): number => {
  // Prefer earliest date, fall back to latest, then observationDate
  return parseYear(photo.earliest) || parseYear(photo.latest) || parseYear(photo.observationDate);
};

const photoDescription = (photo: Photo): string => {
  const parts = [photo.comment, photo.subjectKeyword].filter(Boolean);
  return parts.join(' — ') || '';
};

// Helper: trim/coerce an optional string into either a non-empty value or undefined.
// Keeps `Document` callers from carrying empty strings around.
const opt = (v: string | null | undefined): string | undefined => {
  if (!v) return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
};

const isObject = (photo: Photo): boolean => (photo.objectType || '').trim().toLowerCase() === 'föremål';

export const mapFilmToDocument = (film: Film): Document => ({
  id: `film-${film.filmId}`,
  title: film.documentTitle || '',
  type: 'Film',
  year: parseYear(film.date),
  ort: opt(film.locationText),
  plats: opt(film.location),
  location: pickLocation(film.location, film.locationText),
  creator: '',
  description: film.comment || '',
  files: buildFilmFiles(film),
});

export const mapFilmsToDocuments = (films: Film[]): Document[] => films.map(mapFilmToDocument);

export const mapPublicationToDocument = (pub: Publication): Document => {
  const citation: PublicationCitation | undefined =
    pub.periodicalTitle || pub.issueNumber || pub.pageNumber
      ? { title: opt(pub.periodicalTitle), number: opt(pub.issueNumber), page: opt(pub.pageNumber) }
      : undefined;
  return {
    id: `publ-${pub.publicationId}`,
    title: pub.documentTitle || '',
    type: 'Publication',
    year: parseYear(pub.date),
    ort: opt(pub.locationText) || opt(pub.publisherLocation),
    plats: opt(pub.location),
    location: pickLocation(pub.location, pub.locationText, pub.publisherLocation),
    creator: '',
    description: pub.comment || '',
    publication: citation,
    source: citation
      ? `${citation.title ?? ''}${citation.number ? ` nr ${citation.number}` : ''}${citation.page ? `, s. ${citation.page}` : ''}`.trim()
      : undefined,
    files: buildPublicationFiles(pub),
  };
};

export const mapPublicationsToDocuments = (pubs: Publication[]): Document[] => pubs.map(mapPublicationToDocument);

// Photo holds two semantic kinds distinguished by objectType: photographs ("Foto") and
// catalogued physical objects ("Föremål"). Surface that distinction in the API model so
// the frontend can show separate chips.
export const mapPhotoToDocument = (photo: Photo): Document => ({
  id: `photo-${photo.photoId}`,
  title: photo.documentTitle || '',
  type: isObject(photo) ? 'Object' : 'Photo',
  year: photoYear(photo),
  ort: opt(photo.locationText),
  plats: opt(photo.location),
  location: pickLocation(photo.location, photo.locationText),
  // The legacy site labels referenceCode or accessionNumber as the "Foto Id". Prefer the
  // explicit archive reference (referenceCode) and fall back to accessionNumber.
  accnr: opt(photo.referenceCode) || opt(photo.accessionNumber),
  creator: '',
  description: photoDescription(photo),
  source: photo.rights || undefined,
  files: buildPhotoFiles(photo),
});

export const mapPhotosToDocuments = (photos: Photo[]): Document[] => photos.map(mapPhotoToDocument);

export interface PagingMetaData {
  page: number;
  limit: number;
  count: number;
  totalRecords: number;
  totalPages: number;
}

export interface PagedFilmResponse {
  films: Film[];
  _meta: PagingMetaData;
}

export interface PagedPublicationResponse {
  publications: Publication[];
  _meta: PagingMetaData;
}

export interface PagedPhotoResponse {
  photos: Photo[];
  _meta: PagingMetaData;
}
