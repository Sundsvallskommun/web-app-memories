import { DocumentType } from '@data-contracts/document';
import { ALL_TYPES } from '@utils/filter-state';

export const SORT_KEYS = ['year', 'title', 'objectType'] as const;

export type SortBy = (typeof SORT_KEYS)[number];
export type SortDirection = 'asc' | 'desc';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 12;
export const PAGE_SIZE_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export const parseTypes = (raw: string | null): DocumentType[] => [
  ...new Set(
    (raw ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter((name): name is DocumentType => (ALL_TYPES as readonly string[]).includes(name))
  ),
];

export const parseSortBy = (raw: string | null): SortBy | undefined =>
  raw && (SORT_KEYS as readonly string[]).includes(raw) ? (raw as SortBy) : undefined;

export const parseSortDir = (raw: string | null): SortDirection | undefined =>
  raw === 'asc' || raw === 'desc' ? raw : undefined;

export const parsePage = (raw: string | null): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : DEFAULT_PAGE;
};

export const parseSize = (raw: string | null): number => {
  const n = Number(raw);
  return PAGE_SIZE_OPTIONS.includes(n) ? n : DEFAULT_PAGE_SIZE;
};

// There are records dated 22 and 3000, which are clearly erroneous.
// The corrupted years are filtered out by the bounds below.
const MIN_YEAR = 1000;
const MAX_YEAR = new Date().getFullYear();

export const parseYear = (raw: string | null): number | undefined => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= MIN_YEAR && n <= MAX_YEAR ? n : undefined;
};

/** The chip and modal summary for a period, however few of its ends are set. */
export const periodLabelFor = (yearFrom?: number, yearTo?: number): string | undefined => {
  if (yearFrom && yearTo) return `${yearFrom} - ${yearTo}`;
  if (yearFrom) return `Från ${yearFrom}`;
  if (yearTo) return `Till ${yearTo}`;
  return undefined;
};
