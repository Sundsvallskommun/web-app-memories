'use client';

import { useEffect, useState } from 'react';
import { Filter, PopupMenu, Spinner } from '@sk-web-gui/react';
import { ChevronDown } from 'lucide-react';
import { CHECKBOX_ALIGNMENT_CLASS } from '@components/search-filters/checkbox-alignment';
import { OrganisationCategory, getOrganisationCategories } from '@services/organisation-service';

/** The archive accepts 200 creatorLegalEntityId values in one search, 201 is a 400. */
const MAX_ORGANISATIONS = 200;

interface Props {
  selected: string[];
  onToggle: (category: string) => void;
}

export const CategoryFilterBody: React.FC<Props> = ({ selected, onToggle }) => {
  const [categories, setCategories] = useState<OrganisationCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getOrganisationCategories()
      .then((found) => {
        if (!cancelled) setCategories(found);
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
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={3} />
      </div>
    );
  }

  if (failed || categories.length === 0) {
    return <p className="text-label-small text-dark-secondary p-16">Kategorierna kunde inte hämtas.</p>;
  }

  return (
    <>
      <Filter data-cy="category-filter-list" className={CHECKBOX_ALIGNMENT_CLASS}>
        <Filter.Label className="sr-only">Filtrera på verksamhetskategori</Filter.Label>
        {categories.map((category) => (
          <Filter.Item
            key={category.name}
            checked={selected.includes(category.name)}
            disabled={!category.supported}
            labelPosition="left"
            onChange={() => onToggle(category.name)}
          >
            {`${category.name} (${category.count})`}
          </Filter.Item>
        ))}
      </Filter>

      <p className="text-label-small text-dark-secondary px-16 pb-8">
        Siffran är antalet organisationer i kategorin, inte antalet träffar.
        {categories.some((category) => !category.supported) &&
          ` De gråmarkerade har fler än ${MAX_ORGANISATIONS} organisationer, vilket är så många arkivet kan söka på samtidigt.`}
      </p>
    </>
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
