'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

const SearchPage: React.FC = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentType | undefined>();
  const [sortBy, setSortBy] = useState<'year' | 'title' | 'location'>('year');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

  const doSearch = useCallback(
    async (searchPage = 1, size = pageSize) => {
      setLoading(true);
      setHasSearched(true);
      const params: SearchParams = {
        query: query || undefined,
        type: selectedType,
        sortBy,
        sortDirection,
        page: searchPage,
        pageSize: size,
      };

      const res = await searchDocuments(params);
      setResult(res);
      setPage(searchPage);
      setLoading(false);
    },
    [query, selectedType, sortBy, sortDirection, pageSize]
  );

  useEffect(() => {
    doSearch(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hasSearched) {
      doSearch(1);
    }
  }, [sortBy, sortDirection, selectedType, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    doSearch(1);
  };

  const handleTypeClick = (type: DocumentType) => {
    setSelectedType(selectedType === type ? undefined : type);
  };

  const handlePageChange = (newPage: number) => {
    doSearch(newPage);
  };

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const totalPages = result?.totalPages ?? 0;
  // Range indicator: "Visar X-Y av Z träffar". Page index is 1-based.
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
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onSearch={handleSearch}
                  onReset={() => setQuery('')}
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
              <Button variant="tertiary" size="sm" onClick={() => setSelectedType(undefined)} leftIcon={<X size={14} />}>
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
                {result && result.total === 0 && (
                  <p className="text-label-medium">0 träffar</p>
                )}
              </div>

              <div className="flex items-center gap-sm flex-wrap">
                <label className="text-label-small text-dark-secondary inline-flex items-center gap-xs">
                  Per sida
                  <Select
                    size="sm"
                    value={String(pageSize)}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    data-cy="page-size-select"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <Select.Option key={n} value={String(n)}>
                        {n}
                      </Select.Option>
                    ))}
                  </Select>
                </label>

                <Select size="sm" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'year' | 'title' | 'location')}>
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

            {/* Loading */}
            {loading && (
              <div className="flex justify-center py-xl">
                <Spinner aria-label="Laddar sökresultat" />
              </div>
            )}

            {/* Results table — full details live on the record page, so keep rows
                single-line here and let long values wrap within their own column
                rather than pushing the table wider than the viewport. */}
            {!loading && result && result.documents.length > 0 && (
              // scrollable={false} disables sk-web-gui's default horizontal-scroll
              // wrapper. With explicit column widths below we don't need it.
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
                        <Chip>{doc.type}</Chip>
                      </Table.Column>
                      <Table.Column>{doc.year || '—'}</Table.Column>
                      <Table.Column className="break-words">{doc.location}</Table.Column>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )}

            {/* No results */}
            {!loading && result && result.documents.length === 0 && (
              <div className="text-center py-xl">
                <p className="text-body text-dark-secondary">Inga träffar hittades. Prova att ändra dina sökkriterier.</p>
              </div>
            )}

            {/* Pagination */}
            {!loading && result && totalPages > 1 && (
              <div className="flex justify-center mt-lg">
                <Pagination
                  pages={totalPages}
                  activePage={page}
                  changePage={handlePageChange}
                />
              </div>
            )}
          </div>
        </div>
      </Main>
    </DefaultLayout>
  );
};

export default SearchPage;