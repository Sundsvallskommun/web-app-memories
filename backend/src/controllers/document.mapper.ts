/**
 * The place register entry a record points at. `name` is the parish or locality the
 * old site labels "Ort", `place` the more precise spot it labels "Plats", and
 * `displayName` the two combined, which is what the result list shows.
 */
export interface Topography {
  topographyId: number;
  displayName: string | null;
  name: string | null;
  code: string | null;
  place: string | null;
  municipality: string | null;
}

/** The holding institution, on photos and objects. */
export interface Institution {
  institutionId: number;
  name: string | null;
  code: string | null;
}

export interface Film {
  filmId: number;
  topography?: Topography | null;
  creator?: Creator | null;
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
  creator?: Creator | null;
  topography?: Topography | null;
  filename: string | null;
  publicationType: string | null;
  /** The old "Dokumentdatum". `date` is the publishing date. */
  documentDate: string | null;
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
  nodeId?: number | null;
}

export interface Audio {
  audioId: number;
  topography?: Topography | null;
  filename: string | null;
  objectFilePath: string | null;
  objectType: string | null;
  date: string | null;
  documentTitle: string | null;
  locationText: string | null;
  location: string | null;
  subject: string | null;
  /** Only an id when the person has no name recorded. */
  creator?: Creator | null;
  comment: string | null;
  audioMimeType: string | null;
  nodeId?: number | null;
}

export interface Photo {
  photoId: number;
  creator?: Creator | null;
  topography?: Topography | null;
  institution?: Institution | null;
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
  /** The legacy "Foto Id", from the TIDIGNR column. */
  earlierReference: string | null;
  // IDs of related photos via FOTO_FOTO. Only populated on detail lookup.
  relatedPhotoIds: number[] | null;
  nodeId?: number | null;
}

export interface TextMediaFile {
  id: number;
  thumbnailFilename: string | null;
  largeImageFilename: string | null;
  originalFilename: string | null;
}

export interface Text {
  textId: number;
  topography?: Topography | null;
  filename: string | null;
  documentDate: string | null;
  documentEndDate: string | null;
  documentTitle: string | null;
  locationText: string | null;
  location: string | null;
  subjectId: number | null;
  subject: string | null;
  comment: string | null;
  thumbnailFilename: string | null;
  largeImageFilename: string | null;
  ocrFilename: string | null;
  xmltext: string | null;
  mediaFiles: TextMediaFile[] | null;
  nodeId?: number | null;
}

export interface DocumentFile {
  filename: string;
  format: string;
  size: string;
  variant?: string;
}

// A single extra media item (TEXT_MULTI) addressable via the upstream
// /texts/{id}/media/{mediaId}/file endpoint. `variants` lists which of
// thumbnail/large/original the upstream has a filename for, so the frontend
// only requests variants that actually exist.
export interface DocumentMediaItem {
  id: number;
  variants: string[];
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
  // Extra media files (Text / TEXT_MULTI) shown as a gallery on the detail page.
  media?: DocumentMediaItem[];
  // Composite ids of related documents (Photo / FOTO_FOTO), shown as a
  // "related" strip on the detail page. Each links to its own detail page.
  relatedIds?: string[];
  // Labelled rows for the registers, whose fields do not fit the document shape above.
  details?: DetailRow[];
  // Cleaned HTML: a person's biography or a legal entity's history.
  longText?: string;
}

export interface DetailRow {
  label: string;
  value: string;
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

const formatLabel = (filename: string, fallback: string): string => {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'pdf':
      return 'PDF';
    case 'xml':
      return 'XML';
    case 'jpg':
    case 'jpeg':
      return 'JPEG';
    case 'png':
      return 'PNG';
    case 'tif':
    case 'tiff':
      return 'TIFF';
    case 'txt':
      return 'Text';
    default:
      return fallback;
  }
};

const buildPublicationFiles = (pub: Publication): DocumentFile[] | undefined => {
  const files: DocumentFile[] = [];
  if (pub.largeImageFilename)
    files.push({
      filename: pub.largeImageFilename,
      format: formatLabel(pub.largeImageFilename, 'Stor bild'),
      size: '',
      variant: 'large',
    });
  if (pub.thumbnailFilename)
    files.push({
      filename: pub.thumbnailFilename,
      format: formatLabel(pub.thumbnailFilename, 'Miniatyr'),
      size: '',
      variant: 'thumbnail',
    });
  if (pub.ocrFilename)
    files.push({
      filename: pub.ocrFilename,
      format: formatLabel(pub.ocrFilename, 'Text'),
      size: '',
      variant: 'text',
    });
  return files.length > 0 ? files : undefined;
};

const buildPhotoFiles = (photo: Photo): DocumentFile[] | undefined => {
  const files: DocumentFile[] = [];
  if (photo.largeImageFilename)
    files.push({
      filename: photo.largeImageFilename,
      format: formatLabel(photo.largeImageFilename, 'Bild'),
      size: '',
      variant: 'large',
    });
  if (photo.thumbnailFilename)
    files.push({
      filename: photo.thumbnailFilename,
      format: formatLabel(photo.thumbnailFilename, 'Bild'),
      size: '',
      variant: 'thumbnail',
    });
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

/** Originator name, whichever kind of party it is. */
const creatorName = (creator: Creator | null | undefined): string => creator?.person || creator?.legalEntity || '';

const isObject = (photo: Photo): boolean => (photo.objectType || '').trim().toLowerCase() === 'föremål';

const dateSpan = (from: string | null | undefined, to: string | null | undefined): string | undefined => {
  const start = opt(from);
  const end = opt(to);
  if (start && end && start !== end) return `${start} – ${end}`;
  return start ?? end;
};

export const mapFilmToDocument = (film: Film): Document => ({
  id: `film-${film.filmId}`,
  title: film.documentTitle || '',
  type: 'Film',
  year: parseYear(film.date),
  ort: opt(film.locationText),
  plats: opt(film.location),
  location: pickLocation(film.location, film.locationText),
  creator: creatorName(film.creator),
  description: film.comment || '',
  files: buildFilmFiles(film),
  details: detailRows([
    ['Typ av dokument', opt(film.objectType)],
    ['Dokumentdatum', opt(film.date)],
    ['Dokumenttitel', opt(film.documentTitle)],
    ['Upphovsman', opt(film.creator?.person)],
    ['Juridisk person', opt(film.creator?.legalEntity)],
    ['Ort', opt(film.topography?.name)],
    ['Plats', opt(film.topography?.place)],
    ['Kommentar', opt(film.comment)],
  ]),
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
    creator: creatorName(pub.creator),
    description: pub.comment || '',
    publication: citation,
    source: citation
      ? `${citation.title ?? ''}${citation.number ? ` nr ${citation.number}` : ''}${citation.page ? `, s. ${citation.page}` : ''}`.trim()
      : undefined,
    files: buildPublicationFiles(pub),
    details: detailRows([
      ['Typ av dokument', opt(pub.publicationType) ?? 'Publikation'],
      ['Dokumentdatum', opt(pub.documentDate)],
      ['Utgivningsdatum', opt(pub.date)],
      ['Dokumenttitel', opt(pub.documentTitle)],
      ['Upphovsman', opt(pub.creator?.person)],
      ['Juridisk person', opt(pub.creator?.legalEntity)],
      ['Ort', opt(pub.topography?.name)],
      ['Plats', opt(pub.topography?.place)],
      ['Kommentar', opt(pub.comment)],
    ]),
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
  accnr: opt(photo.earlierReference),
  creator: creatorName(photo.creator),
  description: photoDescription(photo),
  details: detailRows([
    ['Typ av dokument', opt(photo.objectType)],
    ['Foto Id', opt(photo.earlierReference)],
    ['Dokumentdatum', dateSpan(photo.earliest, photo.latest)],
    ['Dokumenttitel', opt(photo.documentTitle)],
    ['Upphovsman', opt(photo.creator?.person)],
    ['Juridisk person', opt(photo.creator?.legalEntity)],
    ['Ort', opt(photo.topography?.name)],
    ['Plats', opt(photo.topography?.place)],
    ['Institution', opt(photo.institution?.name)],
    ['Ämnesord', opt(photo.subjectKeyword)],
    ['Kommentar', opt(photo.comment)],
  ]),
  source: photo.rights || undefined,
  files: buildPhotoFiles(photo),
  // FOTO_FOTO links point at other photo records, each addressable via the same
  // `photo-` prefix (objects share it too). Only present on detail lookup.
  relatedIds:
    photo.relatedPhotoIds && photo.relatedPhotoIds.length > 0
      ? photo.relatedPhotoIds.map(relatedId => `photo-${relatedId}`)
      : undefined,
});

export const mapPhotosToDocuments = (photos: Photo[]): Document[] => photos.map(mapPhotoToDocument);

const buildAudioFiles = (audio: Audio): DocumentFile[] | undefined => {
  const path = audio.objectFilePath || audio.filename;
  if (!path) return undefined;
  const filename = path.replace(/\\/g, '/').split('/').pop() || path;
  return [
    {
      filename,
      format: audio.audioMimeType || 'unknown',
      size: '',
    },
  ];
};

export const mapAudioToDocument = (audio: Audio): Document => ({
  id: `audio-${audio.audioId}`,
  title: audio.documentTitle || '',
  type: 'Audio',
  year: parseYear(audio.date),
  ort: opt(audio.locationText),
  plats: opt(audio.location),
  location: pickLocation(audio.location, audio.locationText),
  // The subject keyword is not the originator; only creator carries that, and it is
  // often absent upstream, which is why the old site shows the row empty too.
  creator: creatorName(audio.creator),
  description: audio.comment || '',
  files: buildAudioFiles(audio),
  details: detailRows([
    ['Typ av dokument', opt(audio.objectType)],
    ['Dokumentdatum', opt(audio.date)],
    ['Dokumenttitel', opt(audio.documentTitle)],
    ['Upphovsman', opt(audio.creator?.person)],
    ['Juridisk person', opt(audio.creator?.legalEntity)],
    ['Ort', opt(audio.topography?.name)],
    ['Plats', opt(audio.topography?.place)],
    ['Kommentar', opt(audio.comment)],
  ]),
});

export const mapAudiosToDocuments = (audios: Audio[]): Document[] => audios.map(mapAudioToDocument);

// Text (memoirs / "minnen") is structurally like Publication: it carries primary
// thumbnail/large images plus an OCR `text` variant (XML transformed to HTML by
// the upstream). On detail lookup it also carries extra TEXT_MULTI media files.
const buildTextFiles = (text: Text): DocumentFile[] | undefined => {
  const files: DocumentFile[] = [];
  if (text.largeImageFilename)
    files.push({
      filename: text.largeImageFilename,
      format: formatLabel(text.largeImageFilename, 'Bild'),
      size: '',
      variant: 'large',
    });
  if (text.thumbnailFilename)
    files.push({
      filename: text.thumbnailFilename,
      format: formatLabel(text.thumbnailFilename, 'Bild'),
      size: '',
      variant: 'thumbnail',
    });
  if (text.ocrFilename)
    files.push({
      filename: text.ocrFilename,
      format: formatLabel(text.ocrFilename, 'Text'),
      size: '',
      variant: 'text',
    });
  return files.length > 0 ? files : undefined;
};

// Map the extra TEXT_MULTI media files (only present on detail lookup) to gallery
// items, recording which image variants each one has so the frontend only
// requests files that actually exist upstream.
const buildTextMedia = (text: Text): DocumentMediaItem[] | undefined => {
  const media = (text.mediaFiles ?? [])
    .map(m => {
      const variants: string[] = [];
      if (m.thumbnailFilename) variants.push('thumbnail');
      if (m.largeImageFilename) variants.push('large');
      if (m.originalFilename) variants.push('original');
      return { id: m.id, variants };
    })
    .filter(item => item.variants.length > 0);
  return media.length > 0 ? media : undefined;
};

export const mapTextToDocument = (text: Text): Document => ({
  id: `text-${text.textId}`,
  title: text.documentTitle || '',
  type: 'Text',
  year: parseYear(text.documentDate),
  ort: opt(text.locationText),
  plats: opt(text.location),
  location: pickLocation(text.location, text.locationText),
  // Texts carry no originator upstream
  creator: '',
  description: text.comment || '',
  files: buildTextFiles(text),
  media: buildTextMedia(text),
  details: detailRows([
    // Every text row upstream carries the same value here, so the old site prints it flat.
    ['Typ av dokument', 'text'],
    ['Dokumentdatum', dateSpan(text.documentDate, text.documentEndDate)],
    ['Dokumenttitel', opt(text.documentTitle)],
    ['Upphovsman', undefined],
    ['Juridisk person', undefined],
    ['Ort', opt(text.topography?.name)],
    ['Plats', opt(text.topography?.place)],
    ['Kommentar', opt(text.comment)],
  ]),
});

export const mapTextsToDocuments = (texts: Text[]): Document[] => texts.map(mapTextToDocument);

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

export interface PagedAudioResponse {
  audios: Audio[];
  _meta: PagingMetaData;
}

export interface PagedTextResponse {
  texts: Text[];
  _meta: PagingMetaData;
}

// ============================================================================
//  Combined object search (/objects)
// ============================================================================
//
// `/objects` searches every object type and register in one call and returns a
// deliberately lean projection: enough to render a result row, and nothing
// more. Media, descriptions and per-type metadata only exist on the detail
// endpoints, which `/documents/:id` still uses.

export interface Creator {
  personId?: number | null;
  person?: string | null;
  legalEntityId?: number | null;
  legalEntity?: string | null;
}

export interface CombinedObject {
  /** Stable key across types, shaped `{type}-{id}` (e.g. `foto-2275`). */
  objectKey: string;
  sourceId: number;
  /** Foto | Föremål | Film | Ljud | Text | Publikation | Person | Juridisk person | Sjöman */
  objectType: string;
  title: string | null;
  /** Derived from the record's date; the birth year for Person and Sjöman. */
  year: number | null;
  topographyId: number | null;
  /** Free-text location; the birth parish for Person and Sjöman. */
  locationText: string | null;
  /** Resolved place name from TOPOGRAFI, preferred over locationText. */
  location: string | null;
  creator?: Creator | null;
  /** The archive node the object sits in. Empty for the registers. */
  nodeId?: number | null;
}

export interface TypeCount {
  objectType: string;
  count: number;
}

export interface CategoryCount {
  categoryId: number;
  name: string;
  count: number;
}

export interface TopographyCount {
  topographyId: number;
  name: string;
  count: number;
}

export interface CombinedObjectResponse {
  objects: CombinedObject[];
  typeCounts: TypeCount[];
  categoryCounts?: CategoryCount[];
  topographyCounts?: TopographyCount[];
  _meta: PagingMetaData;
}

/**
 * Upstream `objectType` to the `type` the frontend already understands.
 * Foto and Föremål are the same upstream collection split by objectType, which
 * is why they share the `foto-` key prefix but map to different types here.
 */
const OBJECT_TYPE_TO_DOCUMENT_TYPE: Record<string, string> = {
  Foto: 'Photo',
  Föremål: 'Object',
  Film: 'Film',
  Ljud: 'Audio',
  Text: 'Text',
  Publikation: 'Publication',
  Person: 'Person',
  'Juridisk person': 'LegalEntity',
  Sjöman: 'Seaman',
  Mantal: 'Census',
};

/** The six types that carry documents. The registers are searchable but are not documents. */
export const DOCUMENT_OBJECT_TYPES = ['Foto', 'Föremål', 'Film', 'Ljud', 'Text', 'Publikation'];

export interface Person {
  personId: number;
  /** The legacy "Indiko nr". */
  personNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  /** YYYYMMDD, YYYY, or "0" when unknown. */
  birthDate: string | null;
  deathDate: string | null;
  birthParish: string | null;
  occupation: string | null;
  movedInParish: string | null;
  movedOutParish: string | null;
  relatedPersonName: string | null;
  relatedPersonOccupation: string | null;
  sources: string | null;
  comment: string | null;
  biographyFilename: string | null;
}

export interface Seaman {
  id: number;
  firstName: string | null;
  lastName1: string | null;
  lastName2: string | null;
  /** The birth parish as an SCB code, labelled "FSCBkod" on the old page. */
  birthParishCode: string | null;
  wage: string | null;
  wagePeriod: string | null;
  currency: string | null;
  signOffReason: string | null;
  registrationNumber: string | null;
  /** YYYYMMDD, YYYY, or empty when unknown, like the other dates here. */
  birthDate: string | null;
  birthParish: string | null;
  birthPlace: string | null;
  homeParish: string | null;
  homePlace: string | null;
  age: string | null;
  civilStatus: string | null;
  father: string | null;
  mother: string | null;
  rank: string | null;
  ship: string | null;
  shipType: string | null;
  shipOwner: string | null;
  captain: string | null;
  homePort: string | null;
  destination: string | null;
  signOnDate: string | null;
  signOnPlace: string | null;
  signOffDate: string | null;
  signOffPlace: string | null;
  enrollmentDate: string | null;
  enrollmentNumber: string | null;
  seamensHouse: string | null;
  archive: string | null;
  archiveNumber: string | null;
  volume: string | null;
  page: string | null;
  note: string | null;
  other: string | null;
}

/** "18460626" becomes "1846-06-26". A bare year is kept, and "0" means unknown. */
const archiveDate = (value: string | null | undefined): string | undefined => {
  const trimmed = opt(value);
  if (!trimmed || trimmed === '0') return undefined;
  return /^\d{8}$/.test(trimmed) ? `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6)}` : trimmed;
};

const joined = (...parts: (string | null | undefined)[]): string | undefined =>
  parts.map(opt).filter(Boolean).join(', ') || undefined;

/** Keeps empty values: a blank row means "nothing recorded", not "no such field". */
const detailRows = (entries: [string, string | undefined][]): DetailRow[] =>
  entries.map(([label, value]) => ({ label, value: value ?? '' }));

export const mapPersonToDocument = (person: Person): Document => ({
  id: `person-${person.personId}`,
  title: [opt(person.firstName), opt(person.lastName)].filter(Boolean).join(' '),
  type: 'Person',
  year: parseYear(archiveDate(person.birthDate) ?? null),
  location: opt(person.birthParish) ?? '',
  creator: '',
  description: '',
  // Labels and order follow the old site
  details: detailRows([
    ['Indiko nr', opt(person.personNumber)],
    ['Kön', opt(person.gender)],
    ['Efternamn', opt(person.lastName)],
    ['Förnamn', opt(person.firstName)],
    ['Födelsedatum', archiveDate(person.birthDate)],
    ['Dödsdatum', archiveDate(person.deathDate)],
    ['Födelseförsamling', opt(person.birthParish)],
    ['Från församling', opt(person.movedInParish)],
    ['Till församling', opt(person.movedOutParish)],
    ['Yrke', opt(person.occupation)],
    ['Kommentar', opt(person.comment)],
    // Not on the old page, but the archive carries them and they are worth showing.
    ['Relaterad person', joined(person.relatedPersonName, person.relatedPersonOccupation)],
    ['Källa', opt(person.sources)],
  ]),
});

export const mapSeamanToDocument = (seaman: Seaman): Document => ({
  id: `sjoman-${seaman.id}`,
  title: [opt(seaman.firstName), opt(seaman.lastName1), opt(seaman.lastName2)].filter(Boolean).join(' '),
  type: 'Seaman',
  year: parseYear(archiveDate(seaman.birthDate) ?? null),
  location: opt(seaman.homeParish) ?? opt(seaman.birthParish) ?? '',
  creator: '',
  description: '',
  details: detailRows([
    ['Förnamn', opt(seaman.firstName)],
    ['Efternamn1', opt(seaman.lastName1)],
    ['Efternamn2', opt(seaman.lastName2)],
    ['Födelseförsamling', opt(seaman.birthParish)],
    ['Födelseplats', opt(seaman.birthPlace)],
    ['Hemförsamling', opt(seaman.homeParish)],
    ['Sjömanshus', opt(seaman.seamensHouse)],
    ['Idnr', seaman.id ? String(seaman.id) : undefined],
    ['Födelsedatum', archiveDate(seaman.birthDate)],
    ['Ålder', opt(seaman.age)],
    ['FSCBkod', opt(seaman.birthParishCode)],
    ['Befattning', opt(seaman.rank)],
    ['Påmönstringsort', opt(seaman.signOnPlace)],
    ['Hyra', opt(seaman.wage)],
    ['Valuta', opt(seaman.currency)],
    ['Inskrivningsnr', opt(seaman.enrollmentNumber)],
    ['Påmönstringsdatum', archiveDate(seaman.signOnDate)],
    ['Bettid', opt(seaman.wagePeriod)],
    ['Avmönstringsdatum', archiveDate(seaman.signOffDate)],
    ['Avmönstringsort', opt(seaman.signOffPlace)],
    ['Orsak', opt(seaman.signOffReason)],
    ['Fartygstyp', opt(seaman.shipType)],
    ['Regnr', opt(seaman.registrationNumber)],
    ['Fartyg', opt(seaman.ship)],
    ['Hemmahamn', opt(seaman.homePort)],
    ['Destination', opt(seaman.destination)],
    ['Redare', opt(seaman.shipOwner)],
    ['Kapten', opt(seaman.captain)],
    // Not on the old page, but recorded in the archive.
    ['Hemort', opt(seaman.homePlace)],
    ['Civilstånd', opt(seaman.civilStatus)],
    ['Far', opt(seaman.father)],
    ['Mor', opt(seaman.mother)],
    ['Inskrivningsdatum', archiveDate(seaman.enrollmentDate)],
    ['Arkiv', joined(seaman.archive, seaman.archiveNumber)],
    ['Volym', joined(seaman.volume, seaman.page ? `sida ${seaman.page}` : undefined)],
    ['Anteckning', opt(seaman.note)],
    ['Övrigt', opt(seaman.other)],
  ]),
});

export interface LegalEntityRecord {
  legalEntityId: number;
  topography?: Topography | null;
  name: string | null;
  alternativeNames: string | null;
  category: string | null;
  location: string | null;
  locationText: string | null;
  startDate: string | null;
  endDate: string | null;
  principal: string | null;
  comment: string | null;
  historyFilename: string | null;
}

export const mapLegalEntityToDocument = (entity: LegalEntityRecord): Document => ({
  id: `jurpers-${entity.legalEntityId}`,
  title: opt(entity.name) ?? '',
  type: 'LegalEntity',
  year: parseYear(entity.startDate),
  location: pickLocation(entity.location, entity.locationText),
  creator: '',
  description: '',
  // Topografiskt namn and Topografisk kod need the topography object from API 3.13.
  details: detailRows([
    ['Namn', opt(entity.name)],
    ['Alternativt namn', opt(entity.alternativeNames)],
    ['Huvudman', opt(entity.principal)],
    ['Start datum', opt(entity.startDate)],
    ['Slutdatum', opt(entity.endDate)],
    ['Topografiskt namn', opt(entity.topography?.name)],
    ['Topografisk kod', opt(entity.topography?.code)],
    ['Plats', opt(entity.topography?.place)],
    ['Obestämbar plats', opt(entity.locationText)],
    ['Kommentar', opt(entity.comment)],
    // Not on the old page, but useful and already filterable in the search.
    ['Kategori', opt(entity.category)],
  ]),
});

export interface CensusRecord {
  id: string;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  /** A full date despite the name, for example "1898-06-24". */
  birthYear: string | null;
  note: string | null;
  objectNumber: string | null;
  source: string | null;
  farmNumber: string | null;
  householdNumber: string | null;
  occupationRelation: string | null;
  orderNumber: string | null;
  serialNumber: string | null;
}

export const mapCensusRecordToDocument = (record: CensusRecord): Document => ({
  id: `mantal-${record.id}`,
  title: [opt(record.firstName), opt(record.lastName)].filter(Boolean).join(' '),
  type: 'Census',
  year: parseYear(record.birthYear),
  location: '',
  creator: '',
  description: '',
  accnr: opt(record.objectNumber),
  source: opt(record.source),
  details: detailRows([
    ['Förnamn', opt(record.firstName)],
    ['Efternamn', opt(record.lastName)],
    ['Kön', opt(record.gender)],
    ['Födelsedatum', archiveDate(record.birthYear)],
    ['Yrke/relation', opt(record.occupationRelation)],
    ['Mantalsår', opt(record.source)],
    ['Gårdsnummer', opt(record.farmNumber)],
    ['Hushållsnummer', opt(record.householdNumber)],
    ['Ordning i hushållet', opt(record.orderNumber)],
    ['Löpnummer', record.serialNumber === '0' ? undefined : opt(record.serialNumber)],
    ['Anteckning', opt(record.note)],
    ['Objektnummer', opt(record.objectNumber)],
  ]),
});

/**
 * `/objects` and `/documents/:id` disagree on two prefixes: upstream says
 * `foto-` and `ljud-` where this API has always said `photo-` and `audio-`.
 * Normalise here so ids stay stable for existing links, bookmarks and the
 * `relatedIds` the detail endpoint emits.
 */
export const normalizeObjectKey = (objectKey: string): string => {
  if (objectKey.startsWith('foto-')) return `photo-${objectKey.slice('foto-'.length)}`;
  if (objectKey.startsWith('ljud-')) return `audio-${objectKey.slice('ljud-'.length)}`;
  return objectKey;
};

export const mapCombinedObjectToDocument = (obj: CombinedObject): Document => ({
  id: normalizeObjectKey(obj.objectKey),
  title: obj.title || '',
  type: OBJECT_TYPE_TO_DOCUMENT_TYPE[obj.objectType] || obj.objectType,
  year: obj.year ?? 0,
  ort: opt(obj.locationText),
  plats: opt(obj.location),
  location: pickLocation(obj.location, obj.locationText),
  creator: creatorName(obj.creator),
  // Not part of the search projection. The detail endpoint carries both.
  description: '',
});

export const mapCombinedObjectsToDocuments = (objects: CombinedObject[]): Document[] =>
  objects.map(mapCombinedObjectToDocument);
