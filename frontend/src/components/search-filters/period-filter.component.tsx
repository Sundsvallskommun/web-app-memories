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

interface BodyProps extends Props {
  autoApply?: boolean;
  row?: boolean;
}

const toYear = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  return /^\d{4}$/.test(trimmed) ? Number(trimmed) : undefined;
};

/** Empty or a whole year. A half-typed year is neither, so it waits. */
const isComplete = (raw: string): boolean => raw.trim() === '' || /^\d{4}$/.test(raw.trim());

export const PeriodFilterBody: React.FC<BodyProps> = ({ yearFrom, yearTo, onApply, autoApply, row }) => {
  const [fromDraft, setFromDraft] = useState(yearFrom ? String(yearFrom) : '');
  const [toDraft, setToDraft] = useState(yearTo ? String(yearTo) : '');

  useEffect(() => {
    setFromDraft(yearFrom ? String(yearFrom) : '');
    setToDraft(yearTo ? String(yearTo) : '');
  }, [yearFrom, yearTo]);

  const apply = () => onApply(toYear(fromDraft), toYear(toDraft));

  const change = (which: 'from' | 'to', value: string) => {
    const from = which === 'from' ? value : fromDraft;
    const to = which === 'to' ? value : toDraft;
    if (which === 'from') setFromDraft(value);
    else setToDraft(value);

    if (autoApply && isComplete(from) && isComplete(to)) onApply(toYear(from), toYear(to));
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className={row ? 'flex gap-16 [&>*]:min-w-0 [&>*]:flex-1' : 'flex flex-col gap-8'}>
        <FormControl className="w-full">
          <FormLabel>Från</FormLabel>
          <YearPicker
            value={fromDraft}
            onChange={(value) => change('from', value)}
            onEnter={apply}
            data-cy="period-from"
          />
        </FormControl>

        <FormControl className="w-full">
          <FormLabel>Till</FormLabel>
          <YearPicker
            value={toDraft}
            onChange={(value) => change('to', value)}
            onEnter={apply}
            align={row ? 'right' : 'left'}
            data-cy="period-to"
          />
        </FormControl>
      </div>

      {!autoApply && (
        <Button color="primary" onClick={apply} className="mt-8">
          Visa tidsperiod
        </Button>
      )}
    </div>
  );
};

export const PeriodFilter: React.FC<Props> = ({ yearFrom, yearTo, onApply }) => (
  <div className="relative">
    <PopupMenu type="dialog">
      <PopupMenu.Button variant="ghost" rightIcon={<ChevronDown size={18} />} data-cy="period-filter">
        Tidsperiod
      </PopupMenu.Button>

      <PopupMenu.Panel className="p-16 w-max">
        <PeriodFilterBody yearFrom={yearFrom} yearTo={yearTo} onApply={onApply} />
      </PopupMenu.Panel>
    </PopupMenu>
  </div>
);

export default PeriodFilter;
