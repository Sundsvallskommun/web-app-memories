'use client';

import { Button, Chip } from '@sk-web-gui/react';
import { DOCUMENT_TYPE_LABELS } from '@data-contracts/document';
import { EMPTY_FILTERS, FilterState, setPeriod, setScoped, toggleOrganisation, toggleType } from '@utils/filter-state';
import { periodLabelFor } from '@utils/search-params';

interface ActiveChip {
  /** Unique per filter, since two filters can carry the same label. */
  key: string;
  label: string;
  clear: () => void;
}

interface Props {
  filters: FilterState;
  onChange: (next: FilterState) => void;
}

export const ActiveFilterChips: React.FC<Props> = ({ filters, onChange }) => {
  const chips: ActiveChip[] = [];
  const periodLabel = periodLabelFor(filters.yearFrom, filters.yearTo);

  if (periodLabel) {
    chips.push({
      key: 'period',
      label: periodLabel,
      clear: () => onChange(setPeriod(filters, undefined, undefined)),
    });
  }

  for (const type of filters.types) {
    chips.push({
      key: `type-${type}`,
      label: DOCUMENT_TYPE_LABELS[type],
      clear: () => onChange(toggleType(filters, type)),
    });
  }

  for (const filter of ['location', 'creator', 'gender'] as const) {
    const value = filters[filter];
    if (value) {
      chips.push({
        key: filter,
        label: value,
        clear: () => onChange(setScoped(filters, filter, undefined)),
      });
    }
  }

  for (const organisation of filters.organisations) {
    chips.push({
      key: `organisation-${organisation.id}`,
      label: organisation.name,
      clear: () => onChange(toggleOrganisation(filters, organisation)),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-8" data-cy="active-filters">
      {chips.map((chip) => (
        <Chip key={chip.key} onClick={chip.clear}>
          {chip.label}
        </Chip>
      ))}

      <Button variant="tertiary" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
        Rensa alla
      </Button>
    </div>
  );
};

export default ActiveFilterChips;
