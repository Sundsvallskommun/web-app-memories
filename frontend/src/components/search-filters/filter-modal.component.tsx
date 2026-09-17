'use client';

import { useState } from 'react';
import { Accordion, Button, Icon, Modal } from '@sk-web-gui/react';
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
  const [openRow, setOpenRow] = useState<string | null>(null);

  const setRowOpen = (key: string, open: boolean) =>
    setOpenRow((previous) => {
      if (open) return key;
      return previous === key ? null : previous;
    });

  const close = () => {
    setOpenRow(null);
    onClose();
  };

  const apply = () => {
    setOpenRow(null);
    onApply();
  };

  return (
    <div className="contents [&>.sk-modal]:contents">
      <Modal
        show={show}
        onClose={close}
        label="Välj filter"
        className="fixed bottom-0 left-0 max-h-[95vh] w-full rounded-0 rounded-t-cards"
        data-cy="filters-modal"
      >
        <Modal.Content className="min-h-0 overflow-y-auto pl-10">
          <Accordion>
            {rows.map((row) => (
              <Accordion.Item
                key={row.key}
                open={openRow === row.key}
                onToggleOpen={(open) => setRowOpen(row.key, open)}
              >
                <Accordion.Item.Header>
                  <Accordion.Item.Title>
                    <span className="flex flex-col gap-6 text-left">
                      <span className="text-h4-sm">{row.label}</span>
                      <span className="text-small font-normal text-dark-secondary">{row.summary}</span>
                    </span>
                  </Accordion.Item.Title>
                  <Accordion.Item.Button data-cy={`filter-row-${row.key}`}>
                    {(open: boolean) => <Icon icon={open ? <ChevronUp /> : <ChevronDown />} />}
                  </Accordion.Item.Button>
                </Accordion.Item.Header>
                <Accordion.Item.Content>{row.body}</Accordion.Item.Content>
              </Accordion.Item>
            ))}
          </Accordion>
        </Modal.Content>

        <Modal.Footer>
          <div className="flex w-full gap-16">
            <Button size="lg" variant="secondary" className="flex-1" onClick={onReset} data-cy="filters-reset">
              Nollställ filter
            </Button>
            <Button size="lg" variant="primary" className="flex-1" onClick={apply} data-cy="filters-apply">
              Använd
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default FilterModal;
