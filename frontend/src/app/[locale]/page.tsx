'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import DefaultLayout from '@layouts/default-layout/default-layout.component';
import Main from '@layouts/main/main.component';
import { SearchField } from '@sk-web-gui/react';
import { DocumentType, SearchParams, SearchResult } from '@data-contracts/document';
import { ActiveFilterChips } from '@components/search-filters/active-filter-chips.component';
import { ResultsToolbar } from '@components/search-results/results-toolbar.component';
import { SearchResults } from '@components/search-results/search-results.component';
import { GENDERS } from '@components/search-filters/person-filter.component';
import { SearchFilterBar } from '@components/search-filters/search-filter-bar.component';
import { searchDocuments } from '@services/document-service';
import { Organisation, getOrganisation } from '@services/organisation-service';
import {
  DEFAULT_PAGE_SIZE,
  SortBy,
  SortDirection,
  parsePage,
  parseSize,
  parseSortBy,
  parseSortDir,
  parseTypes,
  parseYear,
} from '@utils/search-params';
import { FilterState, GENDERED_REGISTERS, filterParams, supports } from '@utils/filter-state';

const SearchPage: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const urlParams = useSearchParams();

  // No useState for these, the URL is the single source of truth.
  const query = urlParams.get('q') ?? '';
  const selectedTypes = parseTypes(urlParams.get('type'));
  const sortBy = parseSortBy(urlParams.get('sort'));
  const sortDirection = parseSortDir(urlParams.get('dir'));
  const page = parsePage(urlParams.get('page'));
  const pageSize = parseSize(urlParams.get('size'));
  const yearFrom = parseYear(urlParams.get('from'));
  const yearTo = parseYear(urlParams.get('to'));
  const location = urlParams.get('location')?.trim() || undefined;
  const creator = urlParams.get('creator')?.trim() || undefined;
  const organisationIds = [
    ...new Set(
      (urlParams.get('org') ?? '')
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];
  const organisationIdsKey = organisationIds.join(',');
  const categories = [
    ...new Set(
      (urlParams.get('category') ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ];
  const categoriesKey = categories.join(',');
  const genderParam = urlParams.get('gender')?.trim();
  const gender = genderParam && GENDERS.includes(genderParam) ? genderParam : undefined;

  const [queryDraft, setQueryDraft] = useState(query);
  useEffect(() => {
    setQueryDraft(query);
  }, [query]);

  const [knownOrganisations, setKnownOrganisations] = useState<Record<number, string>>({});
  const unnamedIds = organisationIds.filter((id) => !knownOrganisations[id]);
  const unnamedIdsKey = unnamedIds.join(',');
  useEffect(() => {
    if (unnamedIds.length === 0) return;
    let cancelled = false;

    Promise.all(unnamedIds.map((id) => getOrganisation(id))).then((found) => {
      if (cancelled) return;
      const resolved = found.filter((organisation): organisation is Organisation => !!organisation);
      if (resolved.length > 0) {
        setKnownOrganisations((previous) => ({
          ...previous,
          ...Object.fromEntries(resolved.map((organisation) => [organisation.id, organisation.name])),
        }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [unnamedIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedOrganisations: Organisation[] = organisationIds.map((id) => ({
    id,
    name: knownOrganisations[id] ?? String(id),
  }));

  /** Everything the filters hold right now, as one value the rules can work on. */
  const currentFilters: FilterState = {
    types: selectedTypes,
    yearFrom,
    yearTo,
    location,
    creator,
    gender,
    organisations: selectedOrganisations,
    categories,
  };

  const [failed, setFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);

  const updateUrl = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(urlParams.toString());
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
          'org' in patch ||
          'category' in patch)
      ) {
        next.delete('page');
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [urlParams, router, pathname]
  );

  const supportsGender = supports('gender', selectedTypes);
  useEffect(() => {
    if (gender && !supportsGender) {
      updateUrl({ type: GENDERED_REGISTERS.join(',') });
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
        categories,
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
      organisationIdsKey,
      categoriesKey,
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
      categories,
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
    updateUrl({ q: trimmed || undefined });
  };

  // Both the bar and the chips report a whole next state, so the rules in
  // filter-state are the only place the filters depend on each other.
  const applyState = (next: FilterState) => {
    setKnownOrganisations((previous) => ({
      ...previous,
      ...Object.fromEntries(next.organisations.map((one) => [one.id, one.name])),
    }));
    updateUrl(filterParams(next));
  };

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: newPage > 1 ? String(newPage) : undefined });
  };

  const handleSortChange = (nextSortBy?: SortBy, nextSortDirection?: SortDirection) => {
    updateUrl({ sort: nextSortBy, dir: nextSortDirection });
  };

  const handlePageSizeChange = (next: number) => {
    updateUrl({ size: next === DEFAULT_PAGE_SIZE ? undefined : String(next) });
  };

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
        <div className="flex flex-col gap-sm">
          <h1 className="sr-only">Sök i Sundsvallsminnen</h1>

          <div className="flex flex-wrap items-center gap-16 rounded-cards py-12 md:flex-nowrap md:gap-8 md:bg-background-200 md:px-16">
            <div className="w-full shrink-0 md:w-[496px]">
              <SearchField
                className="w-full"
                value={queryDraft}
                onChange={(e) => setQueryDraft(e.target.value)}
                onSearch={handleSearch}
                onReset={() => {
                  setQueryDraft('');
                  updateUrl({ q: undefined });
                }}
                placeholder="Fritext sök"
                aria-label="Sökfält"
              />
            </div>

            <SearchFilterBar filters={currentFilters} countFor={getTypeCount} onChange={applyState} />
          </div>

          <ActiveFilterChips filters={currentFilters} onChange={applyState} />

          <div>
            <ResultsToolbar
              result={result}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
            />

            <SearchResults
              result={result}
              loading={loading}
              failed={failed}
              page={page}
              pageSize={pageSize}
              onRetry={() => setRetryToken((t) => t + 1)}
              onDismissError={() => setFailed(false)}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </Main>
    </DefaultLayout>
  );
};

export default SearchPage;
