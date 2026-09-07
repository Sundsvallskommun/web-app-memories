'use client';

import { Filter, PopupMenu, Select } from '@sk-web-gui/react';
import { ChevronDown } from 'lucide-react';
import { SearchResult } from '@data-contracts/document';
import { CHECKBOX_ALIGNMENT_CLASS } from '@components/search-filters/checkbox-alignment';
import { PAGE_SIZE_OPTIONS, SortBy, SortDirection } from '@utils/search-params';

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

interface Props {
  result: SearchResult | null;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  sortBy?: SortBy;
  sortDirection?: SortDirection;
  onSortChange: (sortBy?: SortBy, sortDirection?: SortDirection) => void;
}

export const ResultsToolbar: React.FC<Props> = ({
  result,
  pageSize,
  onPageSizeChange,
  sortBy,
  sortDirection,
  onSortChange,
}) => {
  const rangeStart = result && result.documents.length > 0 ? (result.page - 1) * result.pageSize + 1 : 0;
  const rangeEnd = result ? rangeStart + result.documents.length - 1 : 0;

  const activeSort =
    sortBy && sortDirection ?
      SORT_OPTIONS.find((option) => option.sortBy === sortBy && option.sortDirection === sortDirection)?.value
    : undefined;

  const toggleSort = (value: string) => {
    const option = SORT_OPTIONS.find((one) => one.value === value);
    if (!option?.sortBy || !option.sortDirection) return;

    if (activeSort === value) onSortChange(undefined, undefined);
    else onSortChange(option.sortBy, option.sortDirection);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-sm mb-md">
      <div>
        {result && result.total > 0 && (
          <p className="text-label-medium" data-cy="result-range">
            Visar {rangeStart}–{rangeEnd} av {result.total} {result.total === 1 ? 'träff' : 'träffar'}
          </p>
        )}
        {result && result.total === 0 && <p className="text-label-medium">0 träffar</p>}
      </div>

      <div className="flex items-center justify-between gap-sm flex-wrap">
        <div className="flex items-center gap-sm">
          <label htmlFor="page-size" className="text-label-medium text-dark-secondary inline-flex items-center gap-xs">
            Per sida
          </label>
          <Select
            size="sm"
            value={String(pageSize)}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
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
              <Filter data-cy="sort-filter" className={CHECKBOX_ALIGNMENT_CLASS}>
                <Filter.Label className="sr-only">Sortera efter</Filter.Label>
                {SORT_OPTIONS.map((option) => (
                  <Filter.Item
                    key={option.value}
                    checked={activeSort === option.value}
                    disabled={option.disabled}
                    labelPosition="left"
                    onChange={() => toggleSort(option.value)}
                  >
                    {option.label}
                  </Filter.Item>
                ))}
              </Filter>
            </PopupMenu.Panel>
          </PopupMenu>
        </div>
      </div>
    </div>
  );
};

export default ResultsToolbar;
