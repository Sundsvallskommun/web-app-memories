import { DocumentType } from '@data-contracts/document';
import { Organisation } from '@services/organisation-service';

export const TYPES: DocumentType[] = ['Film', 'Publication', 'Photo', 'Object', 'Audio', 'Text'];
export const REGISTERS: DocumentType[] = ['Person', 'Census', 'Seaman'];
export const GENDERED_REGISTERS: DocumentType[] = ['Person', 'Census'];
export const ALL_TYPES: DocumentType[] = [...TYPES, ...REGISTERS];

export const TYPES_SUPPORTING: Record<'gender' | 'creator' | 'location' | 'organisation', DocumentType[]> = {
  gender: GENDERED_REGISTERS,
  creator: TYPES,
  organisation: TYPES,
  location: [...TYPES, 'Person', 'Seaman'],
};

export type ScopedFilter = 'gender' | 'creator' | 'location';

/** An empty selection means the six document types, which is what a plain search returns. */
export const supports = (filter: keyof typeof TYPES_SUPPORTING, types: DocumentType[]): boolean =>
  (types.length > 0 ? types : TYPES).every((type) => TYPES_SUPPORTING[filter].includes(type));

export interface FilterState {
  types: DocumentType[];
  yearFrom?: number;
  yearTo?: number;
  location?: string;
  creator?: string;
  gender?: string;
  organisations: Organisation[];
}

export const EMPTY_FILTERS: FilterState = { types: [], organisations: [] };

export const withTypes = (state: FilterState, types: DocumentType[]): FilterState => ({
  ...state,
  types,
  gender: state.gender && !supports('gender', types) ? undefined : state.gender,
  creator: state.creator && !supports('creator', types) ? undefined : state.creator,
  location: state.location && !supports('location', types) ? undefined : state.location,
  organisations: state.organisations.length > 0 && !supports('organisation', types) ? [] : state.organisations,
});

export const toggleType = (state: FilterState, type: DocumentType): FilterState =>
  withTypes(state, state.types.includes(type) ? state.types.filter((t) => t !== type) : [...state.types, type]);

/** Ticks all three registers, or clears them when they are already all on. */
export const toggleAllRegisters = (state: FilterState): FilterState => {
  const documentTypes = state.types.filter((type) => !REGISTERS.includes(type));
  const allOn = REGISTERS.every((type) => state.types.includes(type));
  return withTypes(state, allOn ? documentTypes : [...documentTypes, ...REGISTERS]);
};

/**
 * Sets a filter that only some types carry, narrowing the selection to those.
 * Clearing one leaves the types alone: the user narrowed them for a reason.
 */
export const setScoped = (state: FilterState, filter: ScopedFilter, value?: string): FilterState => {
  if (!value) return { ...state, [filter]: undefined };

  const kept = state.types.filter((type) => TYPES_SUPPORTING[filter].includes(type));
  const types =
    kept.length > 0 ? kept
    : filter === 'gender' ? GENDERED_REGISTERS
    : [];

  return { ...state, [filter]: value, types };
};

export const toggleOrganisation = (state: FilterState, organisation: Organisation): FilterState => {
  const on = state.organisations.some((chosen) => chosen.id === organisation.id);
  const organisations =
    on ? state.organisations.filter((chosen) => chosen.id !== organisation.id) : [...state.organisations, organisation];

  // Registers have no originator, so an organisation alongside one would
  // return nothing at all.
  const kept = state.types.filter((type) => TYPES_SUPPORTING.organisation.includes(type));
  return { ...state, organisations, types: organisations.length > 0 ? kept : state.types };
};

export const setPeriod = (state: FilterState, yearFrom?: number, yearTo?: number): FilterState => ({
  ...state,
  yearFrom,
  yearTo,
});

/** The whole state as URL parameters, every key present so cleared ones are removed. */
export const filterParams = (state: FilterState): Record<string, string | undefined> => ({
  type: state.types.length > 0 ? state.types.join(',') : undefined,
  from: state.yearFrom ? String(state.yearFrom) : undefined,
  to: state.yearTo ? String(state.yearTo) : undefined,
  location: state.location,
  creator: state.creator,
  gender: state.gender,
  org: state.organisations.length > 0 ? state.organisations.map((one) => one.id).join(',') : undefined,
});
