'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import DefaultLayout from '@layouts/default-layout/default-layout.component';
import Main from '@layouts/main/main.component';
import { Alert, SearchField, Button, Pagination, Select, Chip, PopupMenu, Filter } from '@sk-web-gui/react';
import { ChevronDown, X } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, DocumentType, SearchParams, SearchResult } from '@data-contracts/document';
import { DocumentCard } from '@components/document-card/document-card.component';
import { DocumentCardSkeleton } from '@components/document-card/document-card-skeleton.component';
import { PeriodFilter } from '@components/search-filters/period-filter.component';
import { PersonFilter, GENDERS } from '@components/search-filters/person-filter.component';
import { TextFilter } from '@components/search-filters/text-filter.component';
import { TypeFilter } from '@components/search-filters/type-filter.component';
import { searchDocuments } from '@services/document-service';

const TYPES: DocumentType[] = ['Film', 'Publication', 'Photo', 'Object', 'Audio', 'Text'];
// Registers of people and organisations. Searchable, but not documents, so they
// only appear when picked rather than in an unfiltered search.
const REGISTERS: DocumentType[] = ['Person', 'Census', 'Seaman'];
// Sjöman is missing on purpose: the source has no gender column for seamen, so
// any gender filter excludes all 116 094 of them.
const GENDERED_REGISTERS: DocumentType[] = ['Person', 'Census'];
const ALL_TYPES: DocumentType[] = [...TYPES, ...REGISTERS];

const GRID_CLASS = 'flex flex-wrap list-none p-0 gap-24';
const GRID_ITEM_CLASS = 'flex w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)]';
const SORT_KEYS = ['year', 'title', 'objectType'] as const;

interface SortOption {
  value: string;
  label: string;
  sortBy?: SortBy;
  sortDirection?: SortDirection;
  disabled?: boolean;
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'year-desc', label: 'Nyast först', sortBy: 'year', sortDirection: 'desc' },
  { value: 'year-asc', label: 'Äldst först', sortBy: 'year', sortDirection: 'asc' },
  { value: 'title-asc', label: 'Titel / Namn A-Ö', sortBy: 'title', sortDirection: 'asc' },
  // Awaiting `location` in the API's sortBy. The field is on the record already.
  { value: 'plats', label: 'Plats (kommer senare)', disabled: true },
  { value: 'objectType-asc', label: 'Kategori', sortBy: 'objectType', sortDirection: 'asc' },
];
type SortBy = (typeof SORT_KEYS)[number];
type SortDirection = 'asc' | 'desc';
const PAGE_SIZE_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

// Defaults; these are elided from the URL so a plain `/sv` stays clean.
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;

// ---------------------------------------------------------------------------
// URL-param parsing helpers. All six pieces of search state live in the URL
// so back-button from the detail page restores the exact view the user was
// looking at, page reloads keep the filter, and filtered URLs are shareable.
// ---------------------------------------------------------------------------

const parseTypes = (raw: string | null): DocumentType[] => [
  ...new Set(
    (raw ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter((name): name is DocumentType => (ALL_TYPES as readonly string[]).includes(name))
  ),
];

const parseSortBy = (raw: string | null): SortBy | undefined =>
  raw && (SORT_KEYS as readonly string[]).includes(raw) ? (raw as SortBy) : undefined;

const parseSortDir = (raw: string | null): SortDirection | undefined =>
  raw === 'asc' || raw === 'desc' ? raw : undefined;

const parsePage = (raw: string | null): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : DEFAULT_PAGE;
};

const parseSize = (raw: string | null): number => {
  const n = Number(raw);
  return PAGE_SIZE_OPTIONS.includes(n) ? n : DEFAULT_PAGE_SIZE;
};

// There are records dated 22 and 3000, which are clearly erroneous.
// The corrupted years are filtered out by the bounds below.
const MIN_YEAR = 1000;
const MAX_YEAR = new Date().getFullYear();

const parseYear = (raw: string | null): number | undefined => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= MIN_YEAR && n <= MAX_YEAR ? n : undefined;
};

// Chip text
const periodLabelFor = (yearFrom?: number, yearTo?: number): string | undefined => {
  if (yearFrom && yearTo) return `${yearFrom} - ${yearTo}`;
  if (yearFrom) return `Från ${yearFrom}`;
  if (yearTo) return `Till ${yearTo}`;
  return undefined;
};

const SearchPage: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive current search state from the URL on every render. No useState for
  // these — the URL is the single source of truth.
  const query = searchParams.get('q') ?? '';
  const selectedTypes = parseTypes(searchParams.get('type'));
  const sortBy = parseSortBy(searchParams.get('sort'));
  const sortDirection = parseSortDir(searchParams.get('dir'));
  const page = parsePage(searchParams.get('page'));
  const pageSize = parseSize(searchParams.get('size'));
  const yearFrom = parseYear(searchParams.get('from'));
  const yearTo = parseYear(searchParams.get('to'));
  const location = searchParams.get('location')?.trim() || undefined;
  const creator = searchParams.get('creator')?.trim() || undefined;
  const genderParam = searchParams.get('gender')?.trim();
  const gender = genderParam && GENDERS.includes(genderParam) ? genderParam : undefined;

  // The only piece of local state: what's currently typed in the search input.
  // We don't commit this to the URL on every keystroke (that would hammer the
  // API). Committed only on Enter / "Sök" click.
  const [queryDraft, setQueryDraft] = useState(query);
  // Keep the draft in sync when the URL changes from outside (back/forward).
  useEffect(() => {
    setQueryDraft(query);
  }, [query]);

  const [failed, setFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
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
      if (
        !('page' in patch) &&
        ('type' in patch ||
          'sort' in patch ||
          'dir' in patch ||
          'size' in patch ||
          'q' in patch ||
          'from' in patch ||
          'to' in patch ||
          'location' in patch ||
          'creator' in patch ||
          'gender' in patch)
      ) {
        next.delete('page');
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // Single searcher: fires whenever any URL-backed state changes.
  // A gender on its own does not describe a search: only Person and Mantal
  // record one, so the BFF falls back to those two. Write that into the URL so
  // the panel, the chips and the results cannot disagree, however the page was
  // reached: a shared link, the back button, or a hand-edited address.
  const supportsGender = selectedTypes.length > 0 && selectedTypes.every((type) => GENDERED_REGISTERS.includes(type));
  useEffect(() => {
    if (gender && !supportsGender) {
      updateParams({ type: GENDERED_REGISTERS.join(',') });
    }
  }, [gender, supportsGender]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchKey = useMemo(
    () =>
      JSON.stringify({
        query,
        selectedTypes,
        yearFrom,
        yearTo,
        location,
        creator,
        gender,
        sortBy,
        sortDirection,
        page,
        pageSize,
      }),
    [query, selectedTypes, yearFrom, yearTo, location, creator, gender, sortBy, sortDirection, page, pageSize]
  );

  useEffect(() => {
    let cancelled = false;
    const params: SearchParams = {
      query: query || undefined,
      types: selectedTypes,
      yearFrom,
      yearTo,
      location,
      creator,
      gender,
      sortBy,
      sortDirection,
      page,
      pageSize,
    };
    setLoading(true);
    setFailed(false);
    searchDocuments(params)
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchKey, retryToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    const trimmed = queryDraft.trim();
    updateParams({ q: trimmed || undefined });
  };

  const handleTypeToggle = (type: DocumentType) => {
    const next = selectedTypes.includes(type) ? selectedTypes.filter((t) => t !== type) : [...selectedTypes, type];
    updateParams({ type: next.length > 0 ? next.join(',') : undefined, ...clearedGenderIfUnsupported(next) });
  };

  // Ticks all three registers at once, or clears them when they are all on.
  // Document types already selected are left alone, since the two dropdowns
  // write to the same parameter.
  const handleAllRegisters = () => {
    const documentTypes = selectedTypes.filter((type) => !REGISTERS.includes(type));
    const allOn = REGISTERS.every((type) => selectedTypes.includes(type));
    const next = allOn ? documentTypes : [...documentTypes, ...REGISTERS];
    updateParams({ type: next.length > 0 ? next.join(',') : undefined, ...clearedGenderIfUnsupported(next) });
  };

  // Gender is one flat condition upstream, applied to the whole query rather than
  // to the person part of it. Anything without the column fails it, so a gender
  // alongside Foto returns no photos at all, and alongside Sjöman returns
  // nothing whatsoever.
  //
  // Rather than let the panel promise what the search cannot deliver, the two
  // are kept consistent in both directions: a gender narrows the selection to
  // the registers that record one, and choosing anything else drops the gender.
  // Ask Linus whether gender can ignore records without the column instead, and
  // this restriction can go.

  /** A gender only holds while every selected type can carry one. */
  const supportsGenderFor = (types: DocumentType[]) =>
    types.length > 0 && types.every((type) => GENDERED_REGISTERS.includes(type));

  /** Drop the gender as soon as the selection stops supporting it. */
  const clearedGenderIfUnsupported = (types: DocumentType[]) =>
    gender && !supportsGenderFor(types) ? { gender: undefined } : {};

  const handleGenderChange = (next?: string) => {
    if (!next) {
      updateParams({ gender: undefined });
      return;
    }

    // Keep only what can carry a gender, defaulting to both registers when the
    // user had picked neither.
    const kept = selectedTypes.filter((type) => GENDERED_REGISTERS.includes(type));
    const types = kept.length > 0 ? kept : GENDERED_REGISTERS;
    updateParams({ gender: next, type: types.join(',') });
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: newPage > 1 ? String(newPage) : undefined });
  };

  const handleSortToggle = (value: string) => {
    const option = SORT_OPTIONS.find((o) => o.value === value);
    if (!option?.sortBy || !option.sortDirection) return;
    const clearing = activeSort === value;
    updateParams({
      sort: clearing ? undefined : option.sortBy,
      dir: clearing ? undefined : option.sortDirection,
    });
  };

  // Which option the URL state corresponds to, or undefined for relevance.
  const activeSort =
    sortBy && sortDirection ?
      SORT_OPTIONS.find((o) => o.sortBy === sortBy && o.sortDirection === sortDirection)?.value
    : undefined;

  const handlePeriodApply = (from?: number, to?: number) => {
    updateParams({ from: from ? String(from) : undefined, to: to ? String(to) : undefined });
  };

  const handlePageSizeChange = (next: number) => {
    updateParams({ size: next === DEFAULT_PAGE_SIZE ? undefined : String(next) });
  };

  const totalPages = result?.totalPages ?? 0;
  const rangeStart = result && result.documents.length > 0 ? (result.page - 1) * result.pageSize + 1 : 0;
  const rangeEnd = result ? rangeStart + result.documents.length - 1 : 0;

  const periodLabel = periodLabelFor(yearFrom, yearTo);

  const activeFilters: { label: string; clear: () => void }[] = [];
  if (periodLabel) {
    activeFilters.push({ label: periodLabel, clear: () => updateParams({ from: undefined, to: undefined }) });
  }
  for (const type of selectedTypes) {
    activeFilters.push({ label: DOCUMENT_TYPE_LABELS[type], clear: () => handleTypeToggle(type) });
  }
  if (location) {
    activeFilters.push({ label: location, clear: () => updateParams({ location: undefined }) });
  }
  if (creator) {
    activeFilters.push({ label: creator, clear: () => updateParams({ creator: undefined }) });
  }
  if (gender) {
    activeFilters.push({ label: gender, clear: () => updateParams({ gender: undefined }) });
  }

  const clearAllFilters = () =>
    updateParams({
      from: undefined,
      to: undefined,
      type: undefined,
      location: undefined,
      creator: undefined,
      gender: undefined,
    });

  const getTypeCount = (type: DocumentType): number => {
    if (!result) return 0;
    if (type === 'Film') return result.filmTotal;
    if (type === 'Publication') return result.publicationTotal;
    if (type === 'Photo') return result.photoTotal;
    if (type === 'Object') return result.objectTotal;
    if (type === 'Audio') return result.audioTotal;
    if (type === 'Text') return result.textTotal;
    if (type === 'Person') return result.personTotal;
    if (type === 'Census') return result.censusTotal;
    if (type === 'Seaman') return result.seamanTotal;
    return 0;
  };

  return (
    <DefaultLayout headerTitle="Sundsvallsminnen" headerSubtitle="Sök i arkivet">
      <Main>
        <div className="flex flex-col gap-md">
          <h1 className="sr-only">Sök i Sundsvallsminnen</h1>

          <div className="flex flex-wrap items-center gap-4 rounded-cards bg-background-200 px-16 py-12">
            <div className="w-[496px]">
              <SearchField
                className="w-full"
                value={queryDraft}
                onChange={(e) => setQueryDraft(e.target.value)}
                onSearch={handleSearch}
                onReset={() => {
                  setQueryDraft('');
                  updateParams({ q: undefined });
                }}
                placeholder="Fritext sök"
                aria-label="Sökfält"
              />
            </div>

            <div className="flex gap-[255px]">
              <div className="flex gap-4">
                <PeriodFilter yearFrom={yearFrom} yearTo={yearTo} onApply={handlePeriodApply} />
                <TypeFilter
                  types={TYPES}
                  selected={selectedTypes}
                  countFor={getTypeCount}
                  onToggle={handleTypeToggle}
                  onClear={() => updateParams({ type: undefined })}
                />
                <TextFilter
                  label="Plats"
                  placeholder="Skriv en plats"
                  applyLabel="Visa plats"
                  value={location}
                  onApply={(next) => updateParams({ location: next })}
                  data-cy="place-filter"
                />
                <TextFilter
                  label="Upphovsperson"
                  placeholder="Skriv ett namn"
                  applyLabel="Visa upphovsperson"
                  value={creator}
                  onApply={(next) => updateParams({ creator: next })}
                  data-cy="creator-filter"
                />
                <PersonFilter
                  registers={REGISTERS}
                  selectedRegisters={selectedTypes.filter((t) => REGISTERS.includes(t))}
                  countFor={getTypeCount}
                  onToggleRegister={handleTypeToggle}
                  gender={gender}
                  onGenderChange={handleGenderChange}
                  onToggleAllRegisters={handleAllRegisters}
                />
              </div>
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-8" data-cy="active-filters">
              {activeFilters.map((filter) => (
                <Chip key={filter.label} onClick={filter.clear}>
                  {filter.label}
                </Chip>
              ))}
              <Button variant="tertiary" size="sm" onClick={clearAllFilters}>
                Rensa alla
              </Button>
            </div>
          )}

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
                <div className="flex items-center gap-sm">
                  <label
                    htmlFor="page-size"
                    className="text-label-medium text-dark-secondary inline-flex items-center gap-xs"
                  >
                    Per sida
                  </label>
                  <Select
                    size="sm"
                    value={String(pageSize)}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    id="page-size"
                    data-cy="page-size-select"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <Select.Option key={n} value={String(n)}>
                        {n}
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                <div className="relative">
                  <PopupMenu>
                    <PopupMenu.Button variant="ghost" size="md" rightIcon={<ChevronDown size={16} />}>
                      Sortering
                    </PopupMenu.Button>
                    <PopupMenu.Panel className="w-[260px]">
                      <Filter
                        data-cy="sort-filter"
                        className="[&_.sk-form-checkbox]:order-last [&_.sk-form-checkbox]:!mr-8"
                      >
                        <Filter.Label className="sr-only">Sortera efter</Filter.Label>
                        {SORT_OPTIONS.map((o) => (
                          <Filter.Item
                            key={o.value}
                            checked={activeSort === o.value}
                            disabled={o.disabled}
                            labelPosition="left"
                            onChange={() => handleSortToggle(o.value)}
                          >
                            {o.label}
                          </Filter.Item>
                        ))}
                      </Filter>
                    </PopupMenu.Panel>
                  </PopupMenu>
                </div>
              </div>
            </div>

            {loading && (
              <ul className={GRID_CLASS} aria-busy="true" aria-label="Laddar sökresultat">
                {Array.from({ length: pageSize }, (_, i) => (
                  <li key={i} className={GRID_ITEM_CLASS}>
                    <DocumentCardSkeleton />
                  </li>
                ))}
              </ul>
            )}

            {!loading && failed && (
              <div role="alert" data-cy="search-error">
                <Alert type="warning">
                  <Alert.Icon />
                  <Alert.Content>
                    <Alert.Content.Title>Sökningen kunde inte genomföras</Alert.Content.Title>
                    <Alert.Content.Description>Det gick inte att hämta träffar just nu.</Alert.Content.Description>

                    <Button variant="link" size="sm" className="mt-xs" onClick={() => setRetryToken((t) => t + 1)}>
                      Försök igen
                    </Button>
                  </Alert.Content>

                  <Button
                    iconButton
                    variant="tertiary"
                    size="sm"
                    aria-label="Stäng meddelandet"
                    onClick={() => setFailed(false)}
                  >
                    <X size={20} />
                  </Button>
                </Alert>
              </div>
            )}

            {!loading && !failed && !!result?.documents?.length && (
              <ul className={GRID_CLASS} data-cy="document-grid">
                {result.documents.map((doc) => (
                  <li key={doc.id} className={GRID_ITEM_CLASS}>
                    <DocumentCard doc={doc} />
                  </li>
                ))}
              </ul>
            )}

            {!loading && !failed && result?.documents?.length === 0 && (
              <div className="text-center py-xl">
                <p className="text-dark-secondary">Inga träffar hittades. Prova att ändra dina sökkriterier.</p>
              </div>
            )}

            {!loading && !failed && result && totalPages > 1 && (
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
