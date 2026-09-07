'use client';

import { useState } from 'react';
import { Button, Modal } from '@sk-web-gui/react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface FilterRow {
  key: string;
  label: string;
  /** What the filter is set to right now, or "Inget". */
  summary: string;
  body: React.ReactNode;
}

interface Props {
  show: boolean;
  rows: FilterRow[];
  /** Empties the draft. Nothing reaches the search until Använd. */
  onReset: () => void;
  /** Applies the draft and closes. */
  onApply: () => void;
  /** Closes without applying, for the X and a click outside. */
  onClose: () => void;
}

export const FilterModal: React.FC<Props> = ({ show, rows, onReset, onApply, onClose }) => {
  const [openRows, setOpenRows] = useState<string[]>([]);

  const toggle = (key: string) =>
    setOpenRows((previous) => (previous.includes(key) ? previous.filter((k) => k !== key) : [...previous, key]));

  const close = () => {
    setOpenRows([]);
    onClose();
  };

  const apply = () => {
    setOpenRows([]);
    onApply();
  };

  return (
    <Modal show={show} onClose={close} label="Välj filter" className="w-full max-w-[395px]" data-cy="filters-modal">
      <div className="flex flex-col">
        {rows.map((row) => {
          const expanded = openRows.includes(row.key);

          return (
            <div key={row.key} className="border-b-1 border-divider">
              <button
                type="button"
                onClick={() => toggle(row.key)}
                aria-expanded={expanded}
                aria-controls={`filter-panel-${row.key}`}
                className="flex w-full items-center justify-between gap-16 py-12 text-left"
                data-cy={`filter-row-${row.key}`}
              >
                <span className="flex flex-col gap-6">
                  <span className="text-h4-sm text-dark-primary font-bold">{row.label}</span>
                  <span className="text-small text-dark-secondary">{row.summary}</span>
                </span>
                {expanded ?
                  <ChevronUp size={20} className="shrink-0" />
                : <ChevronDown size={20} className="shrink-0" />}
              </button>

              {expanded && (
                <div id={`filter-panel-${row.key}`} className="pb-16">
                  {row.body}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal.Footer>
        <div className="flex w-full gap-16">
          <Button variant="secondary" className="flex-1" onClick={onReset} data-cy="filters-reset">
            Nollställ filter
          </Button>
          <Button variant="primary" className="flex-1" onClick={apply} data-cy="filters-apply">
            Använd
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default FilterModal;
