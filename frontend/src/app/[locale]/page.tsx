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
import { OrganisationFilter } from '@components/search-filters/organisation-filter.component';
import { PeriodFilter } from '@components/search-filters/period-filter.component';
import { PersonFilter, GENDERS } from '@components/search-filters/person-filter.component';
import { TextFilter } from '@components/search-filters/text-filter.component';
import { TypeFilter } from '@components/search-filters/type-filter.component';
import { searchDocuments } from '@services/document-service';
import { Organisation, getOrganisation } from '@services/organisation-service';

const TYPES: DocumentType[] = ['Film', 'Publication', 'Photo', 'Object', 'Audio', 'Text'];
const REGISTERS: DocumentType[] = ['Person', 'Census', 'Seaman'];
const GENDERED_REGISTERS: DocumentType[] = ['Person', 'Census'];
const ALL_TYPES: DocumentType[] = [...TYPES, ...REGISTERS];

const TYPES_SUPPORTING: Record<'gender' | 'creator' | 'location' | 'organisation', DocumentType[]> = {
  gender: GENDERED_REGISTERS,
  creator: TYPES,
  organisation: TYPES,
  location: [...TYPES, 'Person', 'Seaman'],
};

/** An empty selection means the six document types, which is what a plain search returns. */
const supports = (filter: keyof typeof TYPES_SUPPORTING, types: DocumentType[]): boolean =>
  (types.length > 0 ? types : TYPES).every((type) => TYPES_SUPPORTING[filter].includes(type));

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

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;

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

  // No useState for these, the URL is the single source of truth.
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
  const organisationIds = [
    ...new Set(
      (searchParams.get('org') ?? '')
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];
  const organisationKey = organisationIds.join(',');
  const genderParam = searchParams.get('gender')?.trim();
  const gender = genderParam && GENDERS.includes(genderParam) ? genderParam : undefined;

  const [queryDraft, setQueryDraft] = useState(query);
  useEffect(() => {
    setQueryDraft(query);
  }, [query]);

  const [knownOrganisations, setKnownOrganisations] = useState<Record<number, string>>({});
  const missingNames = organisationIds.filter((id) => !knownOrganisations[id]);
  const missingKey = missingNames.join(',');
  useEffect(() => {
    if (missingNames.length === 0) return;
    let cancelled = false;

    Promise.all(missingNames.map((id) => getOrganisation(id))).then((found) => {
      if (cancelled) return;
      const named = found.filter((organisation): organisation is Organisation => !!organisation);
      if (named.length > 0) {
        setKnownOrganisations((previous) => ({
          ...previous,
          ...Object.fromEntries(named.map((organisation) => [organisation.id, organisation.name])),
        }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [missingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedOrganisations: Organisation[] = organisationIds.map((id) => ({
    id,
    name: knownOrganisations[id] ?? String(id),
  }));

  const [failed, setFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === '') next.delete(k);
        else next.set(k, v);
      }
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
          'gender' in patch ||
          'org' in patch)
      ) {
        next.delete('page');
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const supportsGender = supports('gender', selectedTypes);
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
        organisationIds,
        sortBy,
        sortDirection,
        page,
        pageSize,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      query,
      selectedTypes,
      yearFrom,
      yearTo,
      location,
      creator,
      gender,
      organisationKey,
      sortBy,
      sortDirection,
      page,
      pageSize,
    ]
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
      organisations: organisationIds,
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
    updateParams({ type: next.length > 0 ? next.join(',') : undefined, ...clearedUnsupportedFilters(next) });
  };

  const handleAllRegisters = () => {
    const documentTypes = selectedTypes.filter((type) => !REGISTERS.includes(type));
    const allOn = REGISTERS.every((type) => selectedTypes.includes(type));
    const next = allOn ? documentTypes : [...documentTypes, ...REGISTERS];
    updateParams({ type: next.length > 0 ? next.join(',') : undefined, ...clearedUnsupportedFilters(next) });
  };

  const clearedUnsupportedFilters = (types: DocumentType[]) => ({
    ...(gender && !supports('gender', types) ? { gender: undefined } : {}),
    ...(creator && !supports('creator', types) ? { creator: undefined } : {}),
    ...(location && !supports('location', types) ? { location: undefined } : {}),
    ...(organisationIds.length > 0 && !supports('organisation', types) ? { org: undefined } : {}),
  });

  const applyScopedFilter = (filter: keyof typeof TYPES_SUPPORTING, value?: string) => {
    if (!value) {
      updateParams({ [filter]: undefined });
      return;
    }

    const kept = selectedTypes.filter((type) => TYPES_SUPPORTING[filter].includes(type));
    const types =
      kept.length > 0 ? kept
      : filter === 'gender' ? GENDERED_REGISTERS
      : [];
    updateParams({ [filter]: value, type: types.length > 0 ? types.join(',') : undefined });
  };

  const handleOrganisationToggle = (organisation: Organisation) => {
    const on = organisationIds.includes(organisation.id);
    const next = on ? organisationIds.filter((id) => id !== organisation.id) : [...organisationIds, organisation.id];
    setKnownOrganisations((previous) => ({ ...previous, [organisation.id]: organisation.name }));

    const kept = selectedTypes.filter((type) => TYPES_SUPPORTING.organisation.includes(type));
    updateParams({
      org: next.length > 0 ? next.join(',') : undefined,
      ...(next.length > 0 && kept.length !== selectedTypes.length ?
        { type: kept.length > 0 ? kept.join(',') : undefined }
      : {}),
    });
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
  for (const organisation of selectedOrganisations) {
    activeFilters.push({ label: organisation.name, clear: () => handleOrganisationToggle(organisation) });
  }

  const clearAllFilters = () =>
    updateParams({
      from: undefined,
      to: undefined,
      type: undefined,
      location: undefined,
      creator: undefined,
      gender: undefined,
      org: undefined,
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
                  onApply={(next) => applyScopedFilter('location', next)}
                  data-cy="place-filter"
                />
                <TextFilter
                  label="Upphovsperson"
                  placeholder="Skriv ett namn"
                  applyLabel="Visa upphovsperson"
                  value={creator}
                  onApply={(next) => applyScopedFilter('creator', next)}
                  data-cy="creator-filter"
                />
                <OrganisationFilter selected={selectedOrganisations} onToggle={handleOrganisationToggle} />
                <PersonFilter
                  registers={REGISTERS}
                  selectedRegisters={selectedTypes.filter((t) => REGISTERS.includes(t))}
                  countFor={getTypeCount}
                  onToggleRegister={handleTypeToggle}
                  gender={gender}
                  onGenderChange={(next) => applyScopedFilter('gender', next)}
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
