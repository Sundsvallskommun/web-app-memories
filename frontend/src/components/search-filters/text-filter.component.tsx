'use client';

import { useEffect, useState } from 'react';
import { Button, FormControl, FormLabel, Input, PopupMenu } from '@sk-web-gui/react';
import { ChevronDown } from 'lucide-react';

interface Props {
  label: string;
  /** Optional: omit when it would only repeat the dropdown label. */
  fieldLabel?: string;
  placeholder: string;
  applyLabel: string;
  value?: string;
  onApply: (value?: string) => void;
  'data-cy'?: string;
}

interface BodyProps extends Props {
  autoApply?: boolean;
}

export const TextFilterBody: React.FC<BodyProps> = ({
  label,
  fieldLabel,
  placeholder,
  applyLabel,
  value,
  onApply,
  autoApply,
  'data-cy': dataCy,
}) => {
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  const apply = () => onApply(draft.trim() || undefined);

  return (
    <div className="flex flex-col gap-8 w-full">
      <FormControl className="w-full">
        {fieldLabel && <FormLabel>{fieldLabel}</FormLabel>}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          onBlur={autoApply ? apply : undefined}
          placeholder={placeholder}
          aria-label={fieldLabel ? undefined : label}
          data-cy={dataCy ? `${dataCy}-input` : undefined}
        />
      </FormControl>

      {!autoApply && (
        <Button color="primary" onClick={apply} className="mt-8">
          {applyLabel}
        </Button>
      )}
    </div>
  );
};

export const TextFilter: React.FC<Props> = (props) => (
  <div className="relative">
    <PopupMenu type="dialog">
      <PopupMenu.Button variant="ghost" rightIcon={<ChevronDown size={18} />} data-cy={props['data-cy']}>
        {props.label}
      </PopupMenu.Button>

      <PopupMenu.Panel className="p-16 w-max">
        <TextFilterBody {...props} />
      </PopupMenu.Panel>
    </PopupMenu>
  </div>
);

export default TextFilter;
