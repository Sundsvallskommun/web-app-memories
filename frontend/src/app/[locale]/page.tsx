'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import DefaultLayout from '@layouts/default-layout/default-layout.component';
import Main from '@layouts/main/main.component';
import {
  SearchField,
  Button,
  Spinner,
  Pagination,
  Select,
  Chip,
  Table,
} from '@sk-web-gui/react';
import { Search, X, ArrowUpDown } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, DocumentType, SearchParams, SearchResult } from '@data-contracts/document';
import { searchDocuments } from '@services/document-service';

const TYPES: DocumentType[] = ['Film', 'Publication', 'Photo', 'Object'];
const SORT_KEYS = ['year', 'title', 'location'] as const;
type SortBy = (typeof SORT_KEYS)[number];
type SortDirection = 'asc' | 'desc';
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

// Defaults; these are elided from the URL so a plain `/sv` stays clean.
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT_BY: SortBy = 'year';
const DEFAULT_SORT_DIR: SortDirection = 'desc';

// ---------------------------------------------------------------------------
// URL-param parsing helpers. All six pieces of search state live in the URL
// so back-button from the detail page restores the exact view the user was
// looking at, page reloads keep the filter, and filtered URLs are shareable.
// ---------------------------------------------------------------------------

const parseType = (raw: string | null): DocumentType | undefined =>
  raw && (TYPES as readonly string[]).includes(raw) ? (raw as DocumentType) : undefined;

const parseSortBy = (raw: string | null): SortBy =>
  raw && (SORT_KEYS as readonly string[]).includes(raw) ? (raw as SortBy) : DEFAULT_SORT_BY;

const parseSortDir = (raw: string | null): SortDirection => (raw === 'asc' ? 'asc' : DEFAULT_SORT_DIR);

const parsePage = (raw: string | null): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : DEFAULT_PAGE;
};

const parseSize = (raw: string | null): number => {
  const n = Number(raw);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
};

const SearchPage: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive current search state from the URL on every render. No useState for
  // these — the URL is the single source of truth.
  const query = searchParams.get('q') ?? '';
  const selectedType = parseType(searchParams.get('type'));
  const sortBy = parseSortBy(searchParams.get('sort'));
  const sortDirection = parseSortDir(searchParams.get('dir'));
  const page = parsePage(searchParams.get('page'));
  const pageSize = parseSize(searchParams.get('size'));

  // The only piece of local state: what's currently typed in the search input.
  // We don't commit this to the URL on every keystroke (that would hammer the
  // API). Committed only on Enter / "Sök" click.
  const [queryDraft, setQueryDraft] = useState(query);
  // Keep the draft in sync when the URL changes from outside (back/forward).
  useEffect(() => {
    setQueryDraft(query);
  }, [query]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);

  // Merge a patch into the current URL params and replace the URL without
  // scrolling to top. Resets `page` to 1 unless the patch sets it explicitly.
  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === '') next.delete(k);
        else next.set(k, v);
      }
      // When filters/sort change, always return to page 1 — offsets aren't
      // meaningful across different result sets.
      if (!('page' in patch) && ('type' in patch || 'sort' in patch || 'dir' in patch || 'size' in patch || 'q' in patch)) {
        next.delete('page');
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  // Single searcher: fires whenever any URL-backed state changes.
  const searchKey = useMemo(
    () => JSON.stringify({ query, selectedType, sortBy, sortDirection, page, pageSize }),
    [query, selectedType, sortBy, sortDirection, page, pageSize],
  );

  useEffect(() => {
    let cancelled = false;
    const params: SearchParams = {
      query: query || undefined,
      type: selectedType,
      sortBy,
      sortDirection,
      page,
      pageSize,
    };
    setLoading(true);
    searchDocuments(params)
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    const trimmed = queryDraft.trim();
    updateParams({ q: trimmed || undefined });
  };

  const handleTypeClick = (type: DocumentType) => {
    updateParams({ type: selectedType === type ? undefined : type });
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: newPage > 1 ? String(newPage) : undefined });
  };

  const toggleSortDirection = () => {
    const next = sortDirection === 'asc' ? 'desc' : 'asc';
    updateParams({ dir: next === DEFAULT_SORT_DIR ? undefined : next });
  };

  const handleSortByChange = (next: SortBy) => {
    updateParams({ sort: next === DEFAULT_SORT_BY ? undefined : next });
  };

  const handlePageSizeChange = (next: number) => {
    updateParams({ size: next === DEFAULT_PAGE_SIZE ? undefined : String(next) });
  };

  const totalPages = result?.totalPages ?? 0;
  const rangeStart = result && result.documents.length > 0 ? (result.page - 1) * result.pageSize + 1 : 0;
  const rangeEnd = result ? rangeStart + result.documents.length - 1 : 0;

  const getTypeCount = (type: DocumentType): number => {
    if (!result) return 0;
    if (type === 'Film') return result.filmTotal;
    if (type === 'Publication') return result.publicationTotal;
    if (type === 'Photo') return result.photoTotal;
    if (type === 'Object') return result.objectTotal;
    return 0;
  };

  return (
    <DefaultLayout headerTitle="Sundsvallsminnen" headerSubtitle="Sök i arkivet">
      <Main>
        <div className="flex flex-col gap-lg">
          {/* Search field */}
          <div>
            <h1 className="text-h2-sm md:text-h2-md mb-md">Sök i Sundsvallsminnen</h1>
            <p className="text-body mb-lg">Sök bland filmer, publikationer, fotografier och föremål i Sundsvalls arkiv.</p>

            <div className="flex gap-sm items-end">
              <div className="flex-grow">
                <SearchField
                  value={queryDraft}
                  onChange={(e) => setQueryDraft(e.target.value)}
                  onSearch={handleSearch}
                  onReset={() => {
                    setQueryDraft('');
                    updateParams({ q: undefined });
                  }}
                  placeholder="Sök i arkivet..."
                  aria-label="Sökfält"
                />
              </div>
              <Button color="vattjom" onClick={handleSearch} leftIcon={<Search size={18} />}>
                Sök
              </Button>
            </div>
          </div>

          {/* Type filter chips */}
          <div className="flex flex-wrap gap-xs items-center">
            <span className="text-label-small mr-sm">Källtyp:</span>
            {TYPES.map((type) => {
              const count = getTypeCount(type);
              const isSelected = selectedType === type;
              return (
                <Chip
                  key={type}
                  onClick={() => handleTypeClick(type)}
                  strong={isSelected}
                  inverted={isSelected}
                  aria-pressed={isSelected}
                >
                  {DOCUMENT_TYPE_LABELS[type]} ({count})
                </Chip>
              );
            })}
            {selectedType && (
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => updateParams({ type: undefined })}
                leftIcon={<X size={14} />}
              >
                Visa alla
              </Button>
            )}
          </div>

          <hr className="border-divider" />

          {/* Results section */}
          <div>
            {/* Range indicator + sort + page-size controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-sm mb-md">
              <div>
                {result && result.total > 0 && (
                  <p className="text-label-medium" data-cy="result-range">
                    Visar {rangeStart}–{rangeEnd} av {result.total} {result.total === 1 ? 'träff' : 'träffar'}
                  </p>
                )}
                {result && result.total === 0 && <p className="text-label-medium">0 träffar</p>}
              </div>

              <div className="flex items-center gap-sm flex-wrap">
                <label className="text-label-small text-dark-secondary inline-flex items-center gap-xs">
                  Per sida
                  <Select
                    size="sm"
                    value={String(pageSize)}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    data-cy="page-size-select"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <Select.Option key={n} value={String(n)}>
                        {n}
                      </Select.Option>
                    ))}
                  </Select>
                </label>

                <Select size="sm" value={sortBy} onChange={(e) => handleSortByChange(e.target.value as SortBy)}>
                  <Select.Option value="year">Sortera efter år</Select.Option>
                  <Select.Option value="title">Sortera efter titel</Select.Option>
                  <Select.Option value="location">Sortera efter plats</Select.Option>
                </Select>

                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={toggleSortDirection}
                  aria-label={sortDirection === 'asc' ? 'Stigande ordning' : 'Fallande ordning'}
                  iconButton
                >
                  <ArrowUpDown size={16} />
                </Button>
              </div>
            </div>

            {loading && (
              <div className="flex justify-center py-xl">
                <Spinner aria-label="Laddar sökresultat" />
              </div>
            )}

            {/* Results table */}
            {!loading && result && result.documents.length > 0 && (
              <Table scrollable={false}>
                <Table.Header>
                  <Table.HeaderColumn className="w-[60%]">Titel</Table.HeaderColumn>
                  <Table.HeaderColumn className="w-[12%]">Typ</Table.HeaderColumn>
                  <Table.HeaderColumn className="w-[8%]">År</Table.HeaderColumn>
                  <Table.HeaderColumn className="w-[20%]">Plats</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {result.documents.map((doc) => (
                    <Table.Row
                      key={doc.id}
                      className="cursor-pointer hover:bg-background-200"
                      onClick={() => router.push(`/dokument/${doc.id}`)}
                    >
                      <Table.Column>
                        <p className="font-bold line-clamp-2">{doc.title || '(Utan titel)'}</p>
                      </Table.Column>
                      <Table.Column>
                        <Chip>{DOCUMENT_TYPE_LABELS[doc.type as DocumentType] ?? doc.type}</Chip>
                      </Table.Column>
                      <Table.Column>{doc.year || '—'}</Table.Column>
                      <Table.Column className="break-words">{doc.location}</Table.Column>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )}

            {!loading && result && result.documents.length === 0 && (
              <div className="text-center py-xl">
                <p className="text-body text-dark-secondary">Inga träffar hittades. Prova att ändra dina sökkriterier.</p>
              </div>
            )}

            {!loading && result && totalPages > 1 && (
              <div className="flex justify-center mt-lg">
                <Pagination pages={totalPages} activePage={page} changePage={handlePageChange} />
              </div>
            )}
          </div>
        </div>
      </Main>
    </DefaultLayout>
  );
};

export default SearchPage;
