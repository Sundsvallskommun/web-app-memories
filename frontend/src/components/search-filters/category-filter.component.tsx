'use client';

import { Filter, PopupMenu } from '@sk-web-gui/react';
import { ChevronDown } from 'lucide-react';
import { CHECKBOX_ALIGNMENT_CLASS } from '@components/search-filters/checkbox-alignment';
import { Category, CategoryCount } from '@data-contracts/document';

interface Props {
  /** The categories with hits in the current search. */
  counts: CategoryCount[];
  selected: Category[];
  onToggle: (category: Category) => void;
}

export const CategoryFilterBody: React.FC<Props> = ({ counts, selected, onToggle }) => {
  const withHits = counts.filter((category) => category.count > 0);
  const options = [
    ...withHits,
    ...selected.filter((chosen) => !withHits.some((category) => category.id === chosen.id)),
  ];

  if (options.length === 0) {
    return (
      <p className="text-label-small text-dark-secondary p-16">Inga kategorier har träffar i den här sökningen.</p>
    );
  }

  return (
    <Filter data-cy="category-filter-list" className={CHECKBOX_ALIGNMENT_CLASS}>
      <Filter.Label className="sr-only">Filtrera på verksamhetskategori</Filter.Label>
      {options.map((category) => (
        <Filter.Item
          key={category.id}
          checked={selected.some((chosen) => chosen.id === category.id)}
          labelPosition="left"
          onChange={() => onToggle({ id: category.id, name: category.name })}
        >
          {'count' in category ? `${category.name} (${category.count})` : category.name}
        </Filter.Item>
      ))}
    </Filter>
  );
};

export const CategoryFilter: React.FC<Props> = (props) => (
  <div className="relative">
    <PopupMenu>
      <PopupMenu.Button variant="ghost" rightIcon={<ChevronDown size={18} />} data-cy="category-filter">
        Verksamhetskategori
      </PopupMenu.Button>

      <PopupMenu.Panel className="w-[320px]">
        <CategoryFilterBody {...props} />
      </PopupMenu.Panel>
    </PopupMenu>
  </div>
);

export default CategoryFilter;
