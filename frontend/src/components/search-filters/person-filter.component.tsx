'use client';

import { Divider, Filter, FormLabel, PopupMenu, RadioButton } from '@sk-web-gui/react';
import { ChevronDown } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@data-contracts/document';

// Person: the three registers of people and organisations, and the gender the
// person registers record.
//
// The two halves look different because they behave differently. Registers are
// alternatives, so they are checkboxes and several can be on at once. Gender is
// typed as a single string upstream, so it is radios: neither the comma form
// nor a repeated parameter matches anything.
//
// Picking a gender also removes every record with no such column, which is all
// six document types and all 116 094 seamen. The counts beside each register
// show what is left.

export const GENDERS = ['Man', 'Kvinna', 'Okänt'];

/**
 * The fourth radio, meaning no gender filter at all. Distinct from Okänt, which
 * is a value 14 records actually hold.
 */
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

export const PersonFilter: React.FC<Props> = ({
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
    <div className="relative">
      <PopupMenu>
        <PopupMenu.Button variant="ghost" rightIcon={<ChevronDown size={18} />} data-cy="person-filter">
          Person
        </PopupMenu.Button>

        <PopupMenu.Panel className="w-[260px]">
          <Filter data-cy="person-filter-list" className="[&_.sk-form-checkbox]:order-last [&_.sk-form-checkbox]:!mr-8">
            <Filter.Label className="sr-only">Filtrera på register och kön</Filter.Label>

            {/* A select-all for the registers, not a way to clear the filter:
              with none ticked the search returns documents and no people at
              all, which is the opposite of what "alla" would promise. */}
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
        </PopupMenu.Panel>
      </PopupMenu>
    </div>
  );
};

export default PersonFilter;
