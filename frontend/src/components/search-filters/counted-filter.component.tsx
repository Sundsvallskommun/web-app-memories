'use client';

import { Filter, PopupMenu } from '@sk-web-gui/react';
import { ChevronDown } from 'lucide-react';
import { OPEN_FILTER_BUTTON_CLASS } from '@components/search-filters/open-filter-button';
import { CHECKBOX_ALIGNMENT_CLASS } from '@components/search-filters/checkbox-alignment';

interface Option {
  id: number;
  name: string;
}

interface CountedOption extends Option {
  count: number;
}

export interface CountedFilterProps {
  counts: CountedOption[];
  selected: Option[];
  onToggle: (option: Option) => void;
}

interface BodyProps extends CountedFilterProps {
  /** Read out to screen readers, for example "Filtrera på institution". */
  listLabel: string;
  emptyText: string;
  listDataCy: string;
}

/**
 * A short list of choices from the search's own counts. Only choices with hits are offered,
 * except the ones already chosen, which stay so they can be unticked.
 */
export const CountedFilterBody: React.FC<BodyProps> = ({
  counts,
  selected,
  onToggle,
  listLabel,
  emptyText,
  listDataCy,
}) => {
  const withHits = counts.filter((option) => option.count > 0);
  const options = [...withHits, ...selected.filter((chosen) => !withHits.some((option) => option.id === chosen.id))];

  if (options.length === 0) {
    return <p className="text-label-small text-dark-secondary p-16">{emptyText}</p>;
  }

  return (
    <Filter data-cy={listDataCy} className={CHECKBOX_ALIGNMENT_CLASS}>
      <Filter.Label className="sr-only">{listLabel}</Filter.Label>
      {options.map((option) => (
        <Filter.Item
          key={option.id}
          checked={selected.some((chosen) => chosen.id === option.id)}
          labelPosition="left"
          onChange={() => onToggle({ id: option.id, name: option.name })}
        >
          {'count' in option ? `${option.name} (${option.count})` : option.name}
        </Filter.Item>
      ))}
    </Filter>
  );
};

interface FilterProps extends BodyProps {
  buttonLabel: string;
  buttonDataCy: string;
}

export const CountedFilter: React.FC<FilterProps> = ({ buttonLabel, buttonDataCy, ...body }) => (
  <div className="relative">
    <PopupMenu>
      <PopupMenu.Button
        size="sm"
        variant="ghost"
        rightIcon={<ChevronDown size={18} />}
        className={OPEN_FILTER_BUTTON_CLASS}
        data-cy={buttonDataCy}
      >
        {buttonLabel}
      </PopupMenu.Button>

      {/* Kept inside the window. Grabbing the page scrollbar would close the popup. */}
      <PopupMenu.Panel className="w-[320px] max-h-[50vh] overflow-y-auto">
        <CountedFilterBody {...body} />
      </PopupMenu.Panel>
    </PopupMenu>
  </div>
);
