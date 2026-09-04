'use client';

import { useEffect, useState } from 'react';
import { Button, FormControl, FormLabel, Input, PopupMenu } from '@sk-web-gui/react';
import { ChevronDown } from 'lucide-react';

interface Props {
  label: string;
  fieldLabel: string;
  placeholder: string;
  applyLabel: string;
  value?: string;
  onApply: (value?: string) => void;
  'data-cy'?: string;
}

export const TextFilter: React.FC<Props> = ({
  label,
  fieldLabel,
  placeholder,
  applyLabel,
  value,
  onApply,
  'data-cy': dataCy,
}) => {
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  const apply = () => onApply(draft.trim() || undefined);

  return (
    <div className="relative">
      <PopupMenu type="dialog">
        <PopupMenu.Button variant="ghost" rightIcon={<ChevronDown size={18} />} data-cy={dataCy}>
          {label}
        </PopupMenu.Button>

        <PopupMenu.Panel className="p-16 w-max">
          <div className="flex flex-col gap-8 w-full">
            <FormControl className="w-full">
              <FormLabel>{fieldLabel}</FormLabel>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && apply()}
                placeholder={placeholder}
                data-cy={dataCy ? `${dataCy}-input` : undefined}
              />
            </FormControl>

            <Button color="primary" onClick={apply} className="mt-8">
              {applyLabel}
            </Button>
          </div>
        </PopupMenu.Panel>
      </PopupMenu>
    </div>
  );
};

export default TextFilter;
