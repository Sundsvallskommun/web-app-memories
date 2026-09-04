'use client';

import { useEffect, useState } from 'react';
import { Button, FormControl, FormLabel, PopupMenu } from '@sk-web-gui/react';
import { ChevronDown } from 'lucide-react';
import { YearPicker } from '@components/search-filters/year-picker.component';

interface Props {
  yearFrom?: number;
  yearTo?: number;
  onApply: (yearFrom?: number, yearTo?: number) => void;
}

const toYear = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  return /^\d{4}$/.test(trimmed) ? Number(trimmed) : undefined;
};

export const PeriodFilter: React.FC<Props> = ({ yearFrom, yearTo, onApply }) => {
  const [fromDraft, setFromDraft] = useState(yearFrom ? String(yearFrom) : '');
  const [toDraft, setToDraft] = useState(yearTo ? String(yearTo) : '');

  useEffect(() => {
    setFromDraft(yearFrom ? String(yearFrom) : '');
    setToDraft(yearTo ? String(yearTo) : '');
  }, [yearFrom, yearTo]);

  const apply = () => onApply(toYear(fromDraft), toYear(toDraft));

  return (
    <div className="relative">
      <PopupMenu type="dialog">
        <PopupMenu.Button variant="ghost" rightIcon={<ChevronDown size={18} />} data-cy="period-filter">
          Tidsperiod
        </PopupMenu.Button>

        <PopupMenu.Panel className="p-16 w-max">
          <div className="flex flex-col gap-8 w-full">
            <FormControl className="w-full">
              <FormLabel>Från</FormLabel>
              <YearPicker value={fromDraft} onChange={setFromDraft} onEnter={apply} data-cy="period-from" />
            </FormControl>

            <FormControl className="w-full">
              <FormLabel>Till</FormLabel>
              <YearPicker value={toDraft} onChange={setToDraft} onEnter={apply} data-cy="period-to" />
            </FormControl>

            <Button color="primary" onClick={apply} className="mt-8">
              Visa tidsperiod
            </Button>
          </div>
        </PopupMenu.Panel>
      </PopupMenu>
    </div>
  );
};

export default PeriodFilter;
