export type DocumentType = 'Film' | 'Publication' | 'Photo' | 'Object' | 'Audio' | 'Text';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  Film: 'Film',
  Publication: 'Publikation',
  Photo: 'Foto',
  Object: 'Föremål',
  Audio: 'Ljud',
  Text: 'Text',
};

export interface DocumentFile {
  filename: string;
  format: string;
  size: string;
  variant?: string;
}

// An extra media file (Text / TEXT_MULTI) shown in the detail-page gallery.
// `variants` lists which of thumbnail/large/original the archive has, so the
// gallery only requests files that exist. Fetched via
// /documents/:id/media/:id/file?variant=...
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
  // 0 = unknown / not set. UI should render as "—".
  year: number;
  // Free-text place name (legacy locationText columns).
  ort?: string;
  // Resolved place name from TOPOGRAFI (preferred over ort when present).
  plats?: string;
  // Display fallback combining plats || ort. Useful for the list view.
  location: string;
  creator: string;
  description: string;
  // Photo identifier from referenceCode or accessionNumber.
  accnr?: string;
  // Pending upstream support — backend may emit undefined for now.
  archiveCollection?: string;
  institution?: string;
  // Structured citation (Publication only).
  publication?: PublicationCitation;
  source?: string;
  archiveReference?: string;
  files?: DocumentFile[];
  // Extra media files (Text records) rendered as a gallery on the detail page.
  media?: DocumentMediaItem[];
  // Composite ids of related documents (Photo / FOTO_FOTO). Each links to its
  // own detail page from the "Relaterade foton" strip.
  relatedIds?: string[];
}

export interface SearchParams {
  query?: string;
  type?: DocumentType;
  sortBy?: 'year' | 'title' | 'location';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  documents: Document[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
  filmTotal: number;
  publicationTotal: number;
  photoTotal: number;
  objectTotal: number;
  audioTotal: number;
  textTotal: number;
}
