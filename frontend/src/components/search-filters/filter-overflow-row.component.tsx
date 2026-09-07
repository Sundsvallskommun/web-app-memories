'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Button, PopupMenu } from '@sk-web-gui/react';
import { ListFilter } from 'lucide-react';

export interface FilterItem {
  key: string;
  node: React.ReactNode;
}

interface Props {
  items: FilterItem[];
  className?: string;
}

export const FilterOverflowRow: React.FC<Props> = ({ items, className }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const widths = useRef<number[] | null>(null);
  const moreWidth = useRef(0);
  const [visibleCount, setVisibleCount] = useState(items.length);
  const [moreOpen, setMoreOpen] = useState(false);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const measure = () => {
      if (!widths.current) {
        widths.current = Array.from(row.children)
          .slice(0, items.length)
          .map((child) => child.getBoundingClientRect().width);
        moreWidth.current = ghostRef.current?.getBoundingClientRect().width ?? 0;
      }

      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const available = row.clientWidth;

      let used = 0;
      let count = 0;
      for (const width of widths.current) {
        const next = used + width + (count > 0 ? gap : 0);
        if (next > available) break;
        used = next;
        count += 1;
      }

      while (count > 0 && count < items.length && used + gap + moreWidth.current > available) {
        count -= 1;
        used -= widths.current[count] + (count > 0 ? gap : 0);
      }

      setVisibleCount(count);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [items.length]);

  const visible = items.slice(0, visibleCount);
  const hidden = items.slice(visibleCount);

  return (
    <div ref={rowRef} className={`flex min-w-0 items-center gap-4 ${className ?? ''}`}>
      {visible.map((item) => (
        <div key={item.key} className="shrink-0">
          {item.node}
        </div>
      ))}

      {hidden.length > 0 && (
        <div className="relative ml-auto shrink-0">
          <PopupMenu type="dialog" align="end" open={moreOpen} onToggleOpen={setMoreOpen}>
            <PopupMenu.Button variant="tertiary" leftIcon={<ListFilter size={18} />} data-cy="more-filters-button">
              Fler filter
            </PopupMenu.Button>

            <PopupMenu.Panel className="w-max p-16">
              <div className="flex flex-col items-start gap-8">
                {hidden.map((item) => (
                  <div key={item.key} className="w-full">
                    {item.node}
                  </div>
                ))}

                <Button color="primary" className="mt-8 w-full" onClick={() => setMoreOpen(false)}>
                  Applicera filter
                </Button>
              </div>
            </PopupMenu.Panel>
          </PopupMenu>
        </div>
      )}

      {/* Out of flow and only here to be measured: the row has to know how much
        room "Fler filter" needs before it decides that it needs one. */}
      <div ref={ghostRef} aria-hidden className="invisible pointer-events-none absolute -z-10">
        <Button variant="tertiary" leftIcon={<ListFilter size={18} />} tabIndex={-1}>
          Fler filter
        </Button>
      </div>
    </div>
  );
};

export default FilterOverflowRow;
