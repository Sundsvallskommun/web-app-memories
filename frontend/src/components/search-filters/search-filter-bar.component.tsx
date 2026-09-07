'use client';

import { useState } from 'react';
import { Button } from '@sk-web-gui/react';
import { ListFilter } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@data-contracts/document';
import { FilterModal, FilterRow } from '@components/search-filters/filter-modal.component';
import { FilterItem, FilterOverflowRow } from '@components/search-filters/filter-overflow-row.component';
import { OrganisationFilter, OrganisationFilterBody } from '@components/search-filters/organisation-filter.component';
import { PeriodFilter, PeriodFilterBody } from '@components/search-filters/period-filter.component';
import { PersonFilter, PersonFilterBody } from '@components/search-filters/person-filter.component';
import { TextFilter, TextFilterBody } from '@components/search-filters/text-filter.component';
import { TypeFilter, TypeFilterBody } from '@components/search-filters/type-filter.component';
import {
  EMPTY_FILTERS,
  FilterState,
  REGISTERS,
  TYPES,
  setPeriod,
  setScoped,
  toggleAllRegisters,
  toggleOrganisation,
  toggleType,
} from '@utils/filter-state';
import { periodLabelFor } from '@utils/search-params';
import { BELOW_MD, useMediaQuery } from '@utils/use-media-query';

const NOTHING = 'Inget';

interface Props {
  filters: FilterState;
  countFor: (type: DocumentType) => number;
  onChange: (next: FilterState) => void;
}

export const SearchFilterBar: React.FC<Props> = ({ filters, countFor, onChange }) => {
  const isMobile = useMediaQuery(BELOW_MD);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<FilterState>(EMPTY_FILTERS);

  const registersIn = (state: FilterState) => state.types.filter((type) => REGISTERS.includes(type));

  const items: FilterItem[] = [
    {
      key: 'period',
      node: (
        <PeriodFilter
          yearFrom={filters.yearFrom}
          yearTo={filters.yearTo}
          onApply={(from, to) => onChange(setPeriod(filters, from, to))}
        />
      ),
    },
    {
      key: 'type',
      node: (
        <TypeFilter
          types={TYPES}
          selected={filters.types}
          countFor={countFor}
          onToggle={(type) => onChange(toggleType(filters, type))}
          onClear={() => onChange({ ...filters, types: [] })}
        />
      ),
    },
    {
      key: 'person',
      node: (
        <PersonFilter
          registers={REGISTERS}
          selectedRegisters={registersIn(filters)}
          countFor={countFor}
          onToggleRegister={(type) => onChange(toggleType(filters, type))}
          gender={filters.gender}
          onGenderChange={(next) => onChange(setScoped(filters, 'gender', next))}
          onToggleAllRegisters={() => onChange(toggleAllRegisters(filters))}
        />
      ),
    },
    {
      key: 'location',
      node: (
        <TextFilter
          label="Plats"
          placeholder="Skriv en plats"
          applyLabel="Visa plats"
          value={filters.location}
          onApply={(next) => onChange(setScoped(filters, 'location', next))}
          data-cy="place-filter"
        />
      ),
    },
    {
      key: 'creator',
      node: (
        <TextFilter
          label="Upphovsperson"
          placeholder="Skriv ett namn"
          applyLabel="Visa upphovsperson"
          value={filters.creator}
          onApply={(next) => onChange(setScoped(filters, 'creator', next))}
          data-cy="creator-filter"
        />
      ),
    },
    {
      key: 'organisation',
      node: (
        <OrganisationFilter
          selected={filters.organisations}
          onToggle={(organisation) => onChange(toggleOrganisation(filters, organisation))}
        />
      ),
    },
  ];

  const draftRegisters = registersIn(draft);
  const rows: FilterRow[] = [
    {
      key: 'period',
      label: 'Tidsperiod',
      summary: periodLabelFor(draft.yearFrom, draft.yearTo) ?? NOTHING,
      body: (
        <PeriodFilterBody
          yearFrom={draft.yearFrom}
          yearTo={draft.yearTo}
          onApply={(from, to) => setDraft(setPeriod(draft, from, to))}
          autoApply
          row
        />
      ),
    },
    {
      key: 'type',
      label: 'Typ',
      summary:
        draft.types
          .filter((type) => TYPES.includes(type))
          .map((type) => DOCUMENT_TYPE_LABELS[type])
          .join(', ') || NOTHING,
      body: (
        <TypeFilterBody
          types={TYPES}
          selected={draft.types}
          countFor={countFor}
          onToggle={(type) => setDraft(toggleType(draft, type))}
          onClear={() => setDraft({ ...draft, types: [] })}
        />
      ),
    },
    {
      key: 'location',
      label: 'Plats',
      summary: draft.location ?? NOTHING,
      body: (
        <TextFilterBody
          label="Plats"
          placeholder="Skriv en plats"
          applyLabel="Visa plats"
          value={draft.location}
          onApply={(next) => setDraft(setScoped(draft, 'location', next))}
          autoApply
          data-cy="place-filter"
        />
      ),
    },
    {
      key: 'creator',
      label: 'Upphovsperson',
      summary: draft.creator ?? NOTHING,
      body: (
        <TextFilterBody
          label="Upphovsperson"
          placeholder="Skriv ett namn"
          applyLabel="Visa upphovsperson"
          value={draft.creator}
          onApply={(next) => setDraft(setScoped(draft, 'creator', next))}
          autoApply
          data-cy="creator-filter"
        />
      ),
    },
    {
      key: 'person',
      label: 'Person',
      summary:
        [...draftRegisters.map((type) => DOCUMENT_TYPE_LABELS[type]), ...(draft.gender ? [draft.gender] : [])].join(
          ', '
        ) || NOTHING,
      body: (
        <PersonFilterBody
          registers={REGISTERS}
          selectedRegisters={draftRegisters}
          countFor={countFor}
          onToggleRegister={(type) => setDraft(toggleType(draft, type))}
          gender={draft.gender}
          onGenderChange={(next) => setDraft(setScoped(draft, 'gender', next))}
          onToggleAllRegisters={() => setDraft(toggleAllRegisters(draft))}
        />
      ),
    },
    {
      key: 'organisation',
      label: 'Institution',
      summary: draft.organisations.map((organisation) => organisation.name).join(', ') || NOTHING,
      body: (
        <OrganisationFilterBody
          selected={draft.organisations}
          onToggle={(organisation) => setDraft(toggleOrganisation(draft, organisation))}
          hideLabel
        />
      ),
    },
  ];

  if (!isMobile) return <FilterOverflowRow items={items} className="flex-1" />;

  return (
    <>
      <Button
        variant="tertiary"
        leftIcon={<ListFilter size={18} />}
        onClick={() => {
          setDraft(filters);
          setModalOpen(true);
        }}
        className="w-full"
        data-cy="filters-modal-button"
      >
        Filter
      </Button>

      <FilterModal
        show={modalOpen}
        rows={rows}
        onReset={() => setDraft(EMPTY_FILTERS)}
        onApply={() => {
          onChange(draft);
          setModalOpen(false);
        }}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};

export default SearchFilterBar;
