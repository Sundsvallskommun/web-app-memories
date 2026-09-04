'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Icon, Input } from '@sk-web-gui/react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const YEARS_PER_PAGE = 10;

const pageStart = (year: number): number => Math.floor(year / 10) * 10;

interface Props {
  value: string;
  onChange: (value: string) => void;
  onPick?: (year: number) => void;
  onEnter?: () => void;
  'data-cy'?: string;
}

export const YearPicker: React.FC<Props> = ({ value, onChange, onPick, onEnter, 'data-cy': dataCy }) => {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(() => pageStart(Number(value) || new Date().getFullYear()));
  const wrapper = useRef<HTMLDivElement>(null);

  // Opening lands the grid on whatever is typed, so the year in the field is
  // the one you see.
  const toggle = () => {
    setOpen((wasOpen) => {
      if (!wasOpen && /^\d{4}$/.test(value.trim())) setStart(pageStart(Number(value)));
      return !wasOpen;
    });
  };

  // Close on a click elsewhere or on Escape, like any other popover.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (year: number) => {
    onChange(String(year));
    onPick?.(year);
    setOpen(false);
  };

  const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => start + i);
  const selected = Number(value);

  return (
    <div ref={wrapper} className="relative">
      <Input.InnerGroup className="w-full">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
          placeholder="åååå"
          inputMode="numeric"
          maxLength={4}
          data-cy={dataCy}
        />
        <Input.RightAddin icon onClick={toggle}>
          <Icon icon={<Calendar />} size="17px" />
        </Input.RightAddin>
      </Input.InnerGroup>

      {open && (
        <div
          className="absolute z-10 mt-4 rounded-cards border-1 border-divider bg-background-content p-8 shadow-100"
          data-cy={dataCy ? `${dataCy}-grid` : undefined}
        >
          <div className="flex items-center justify-between gap-8 mb-8">
            <Button
              iconButton
              size="sm"
              variant="tertiary"
              aria-label="Tidigare år"
              onClick={() => setStart(start - YEARS_PER_PAGE)}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="text-label-small">
              {years[0]} - {years[years.length - 1]}
            </span>
            <Button
              iconButton
              size="sm"
              variant="tertiary"
              aria-label="Senare år"
              onClick={() => setStart(start + YEARS_PER_PAGE)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>

          <div className="grid grid-cols-5 gap-4">
            {years.map((year) => (
              <Button
                key={year}
                size="sm"
                variant={year === selected ? 'primary' : 'tertiary'}
                color="primary"
                onClick={() => pick(year)}
              >
                {year}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default YearPicker;
