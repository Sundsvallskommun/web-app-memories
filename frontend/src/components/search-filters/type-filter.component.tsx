'use client';

import { Filter, PopupMenu } from '@sk-web-gui/react';
import { ChevronDown } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@data-contracts/document';

interface Props {
  types: DocumentType[];
  selected: DocumentType[];
  countFor: (type: DocumentType) => number;
  onToggle: (type: DocumentType) => void;
  onClear: () => void;
}

export const TypeFilter: React.FC<Props> = ({ types, selected, countFor, onToggle, onClear }) => (
  <div className="relative">
    <PopupMenu>
      <PopupMenu.Button variant="ghost" rightIcon={<ChevronDown size={18} />} data-cy="type-filter">
        Typ
      </PopupMenu.Button>

      <PopupMenu.Panel className="w-[260px]">
        <Filter data-cy="type-filter-list" className="[&_.sk-form-checkbox]:order-last [&_.sk-form-checkbox]:!mr-8">
          <Filter.Label className="sr-only">Filtrera på typ</Filter.Label>

          <Filter.Item checked={selected.length === 0} labelPosition="left" onChange={onClear}>
            Visa alla
          </Filter.Item>

          {types.map((type) => (
            <Filter.Item
              key={type}
              checked={selected.includes(type)}
              labelPosition="left"
              onChange={() => onToggle(type)}
            >
              {`${DOCUMENT_TYPE_LABELS[type]} (${countFor(type)})`}
            </Filter.Item>
          ))}
        </Filter>
      </PopupMenu.Panel>
    </PopupMenu>
  </div>
);

export default TypeFilter;
