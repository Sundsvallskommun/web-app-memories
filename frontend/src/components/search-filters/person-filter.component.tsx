'use client';

import { Divider, Filter, FormLabel, PopupMenu, RadioButton } from '@sk-web-gui/react';
import { ChevronDown } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@data-contracts/document';
import { CHECKBOX_ALIGNMENT_CLASS } from '@components/search-filters/checkbox-alignment';

export const GENDERS = ['Man', 'Kvinna', 'Okänt'];

const ANY_GENDER = 'alla';

interface Props {
  registers: DocumentType[];
  selectedRegisters: DocumentType[];
  countFor: (type: DocumentType) => number;
  onToggleRegister: (type: DocumentType) => void;
  gender?: string;
  onGenderChange: (gender?: string) => void;
  /** Ticks all three registers, or clears them when they are already all on. */
  onToggleAllRegisters: () => void;
}

export const PersonFilterBody: React.FC<Props> = ({
  registers,
  selectedRegisters,
  countFor,
  onToggleRegister,
  gender,
  onGenderChange,
  onToggleAllRegisters,
}) => {
  const allRegistersOn = registers.length > 0 && registers.every((type) => selectedRegisters.includes(type));

  return (
    <>
      <Filter data-cy="person-filter-list" className={CHECKBOX_ALIGNMENT_CLASS}>
        <Filter.Label className="sr-only">Filtrera på register och kön</Filter.Label>

        <Filter.Item checked={allRegistersOn} labelPosition="left" onChange={onToggleAllRegisters}>
          Visa alla
        </Filter.Item>

        {registers.map((type) => (
          <Filter.Item
            key={type}
            checked={selectedRegisters.includes(type)}
            labelPosition="left"
            onChange={() => onToggleRegister(type)}
          >
            {`${DOCUMENT_TYPE_LABELS[type]} (${countFor(type)})`}
          </Filter.Item>
        ))}
      </Filter>

      <Divider className="my-8" />

      <div className="flex flex-col gap-4 px-16 pb-8">
        <FormLabel>Kön</FormLabel>
        <RadioButton.Group name="gender" value={gender ?? ANY_GENDER} data-cy="gender-options">
          <RadioButton value={ANY_GENDER} onChange={() => onGenderChange(undefined)}>
            Alla kön
          </RadioButton>
          {GENDERS.map((option) => (
            <RadioButton key={option} value={option} onChange={() => onGenderChange(option)}>
              {option}
            </RadioButton>
          ))}
        </RadioButton.Group>
      </div>
    </>
  );
};

export const PersonFilter: React.FC<Props> = (props) => (
  <div className="relative">
    <PopupMenu>
      <PopupMenu.Button variant="ghost" rightIcon={<ChevronDown size={18} />} data-cy="person-filter">
        Person
      </PopupMenu.Button>

      <PopupMenu.Panel className="w-[260px]">
        <PersonFilterBody {...props} />
      </PopupMenu.Panel>
    </PopupMenu>
  </div>
);

export default PersonFilter;
