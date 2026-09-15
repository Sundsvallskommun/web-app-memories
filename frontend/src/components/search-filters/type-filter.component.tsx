'use client';

import { Filter, PopupMenu } from '@sk-web-gui/react';
import { ChevronDown } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@data-contracts/document';
import { CHECKBOX_ALIGNMENT_CLASS } from '@components/search-filters/checkbox-alignment';

interface Props {
  types: DocumentType[];
  selected: DocumentType[];
  countFor: (type: DocumentType) => number;
  onToggle: (type: DocumentType) => void;
  onClear: () => void;
}

export const TypeFilterBody: React.FC<Props> = ({ types, selected, countFor, onToggle, onClear }) => (
  <Filter data-cy="type-filter-list" className={CHECKBOX_ALIGNMENT_CLASS}>
    <Filter.Label className="sr-only">Filtrera på typ</Filter.Label>

    <Filter.Item checked={selected.length === 0} labelPosition="left" onChange={onClear}>
      Visa alla
    </Filter.Item>

    {types.map((type) => (
      <Filter.Item key={type} checked={selected.includes(type)} labelPosition="left" onChange={() => onToggle(type)}>
        {`${DOCUMENT_TYPE_LABELS[type]} (${countFor(type)})`}
      </Filter.Item>
    ))}
  </Filter>
);

export const TypeFilter: React.FC<Props> = (props) => (
  <div className="relative">
    <PopupMenu>
      <PopupMenu.Button variant="ghost" rightIcon={<ChevronDown size={18} />} data-cy="type-filter">
        Typ
      </PopupMenu.Button>

      <PopupMenu.Panel className="w-[260px]">
        <TypeFilterBody {...props} />
      </PopupMenu.Panel>
    </PopupMenu>
  </div>
);

export default TypeFilter;
