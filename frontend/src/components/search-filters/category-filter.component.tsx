'use client';

import { CountedFilter, CountedFilterBody, CountedFilterProps } from '@components/search-filters/counted-filter.component';

const LIST = {
  listLabel: 'Filtrera på verksamhetskategori',
  emptyText: 'Inga kategorier har träffar i den här sökningen.',
  listDataCy: 'category-filter-list',
};

export const CategoryFilterBody: React.FC<CountedFilterProps> = (props) => <CountedFilterBody {...props} {...LIST} />;

export const CategoryFilter: React.FC<CountedFilterProps> = (props) => (
  <CountedFilter {...props} {...LIST} buttonLabel="Verksamhetskategori" buttonDataCy="category-filter" />
);

export default CategoryFilter;
