'use client';

import { CountedFilter, CountedFilterBody, CountedFilterProps } from '@components/search-filters/counted-filter.component';

const LIST = {
  listLabel: 'Filtrera på institution',
  emptyText: 'Inga institutioner har träffar i den här sökningen.',
  listDataCy: 'institution-filter-list',
};

export const InstitutionFilterBody: React.FC<CountedFilterProps> = (props) => (
  <CountedFilterBody {...props} {...LIST} />
);

export const InstitutionFilter: React.FC<CountedFilterProps> = (props) => (
  <CountedFilter {...props} {...LIST} buttonLabel="Institution" buttonDataCy="institution-filter" />
);

export default InstitutionFilter;
