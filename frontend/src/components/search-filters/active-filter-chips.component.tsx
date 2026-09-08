'use client';

import { Button, Chip } from '@sk-web-gui/react';
import { DOCUMENT_TYPE_LABELS } from '@data-contracts/document';
import {
  EMPTY_FILTERS,
  FilterState,
  ScopedFilter,
  setPeriod,
  setScoped,
  toggleCategory,
  toggleOrganisation,
  toggleType,
} from '@utils/filter-state';
import { periodLabelFor } from '@utils/search-params';

interface ActiveChip {
  key: string;
  filter: string;
  label: string;
  clear: () => void;
}

const SCOPED_LABELS: Record<ScopedFilter, string> = {
  location: 'Plats',
  creator: 'Upphovsperson',
  gender: 'Kön',
};

const scopedFilters = Object.keys(SCOPED_LABELS) as ScopedFilter[];

interface Props {
  filters: FilterState;
  onChange: (next: FilterState) => void;
}

export const ActiveFilterChips: React.FC<Props> = ({ filters, onChange }) => {
  const periodLabel = periodLabelFor(filters.yearFrom, filters.yearTo);

  const chips: ActiveChip[] = [
    ...(periodLabel ?
      [
        {
          key: 'period',
          filter: 'Tidsperiod',
          label: periodLabel,
          clear: () => onChange(setPeriod(filters, undefined, undefined)),
        },
      ]
    : []),

    ...filters.types.map((type) => ({
      key: `type-${type}`,
      filter: 'Typ',
      label: DOCUMENT_TYPE_LABELS[type],
      clear: () => onChange(toggleType(filters, type)),
    })),

    ...scopedFilters
      .filter((filter) => !!filters[filter])
      .map((filter) => ({
        key: filter,
        filter: SCOPED_LABELS[filter],
        label: filters[filter] as string,
        clear: () => onChange(setScoped(filters, filter, undefined)),
      })),

    ...filters.organisations.map((organisation) => ({
      key: `organisation-${organisation.id}`,
      filter: 'Institution',
      label: organisation.name,
      clear: () => onChange(toggleOrganisation(filters, organisation)),
    })),

    ...filters.categories.map((category) => ({
      key: `category-${category}`,
      filter: 'Verksamhetskategori',
      label: category,
      clear: () => onChange(toggleCategory(filters, category)),
    })),
  ];

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-8" data-cy="active-filters">
      {chips.map((chip) => (
        <Chip key={chip.key} onClick={chip.clear} aria-label={`Ta bort filtret ${chip.filter}: ${chip.label}`}>
          {chip.label}
        </Chip>
      ))}

      <Button variant="tertiary" size="sm" onClick={() => onChange(EMPTY_FILTERS)} aria-label="Rensa alla filter">
        Rensa alla
      </Button>
    </div>
  );
};

export default ActiveFilterChips;
