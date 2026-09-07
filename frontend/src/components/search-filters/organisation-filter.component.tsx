'use client';

import { useEffect, useState } from 'react';
import { Filter, FormLabel, Input, PopupMenu, Spinner } from '@sk-web-gui/react';
import { ChevronDown } from 'lucide-react';
import { Organisation, searchOrganisations } from '@services/organisation-service';

const MIN_TERM = 2;
const DEBOUNCE_MS = 300;

interface Props {
  selected: Organisation[];
  onToggle: (organisation: Organisation) => void;
}

export const OrganisationFilter: React.FC<Props> = ({ selected, onToggle }) => {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Organisation[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = term.trim();
    if (trimmed.length < MIN_TERM) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      searchOrganisations(trimmed)
        .then((found) => {
          if (!cancelled) setResults(found);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  const unlisted = selected.filter((option) => !results.some((result) => result.id === option.id));
  const options = [...unlisted, ...results];

  return (
    <div className="relative">
      <PopupMenu type="dialog">
        <PopupMenu.Button variant="ghost" rightIcon={<ChevronDown size={18} />} data-cy="organisation-filter">
          Institution
        </PopupMenu.Button>

        <PopupMenu.Panel className="w-[320px] p-16">
          <div className="flex flex-col gap-8">
            <FormLabel htmlFor="organisation-search">Institution</FormLabel>
            <Input
              id="organisation-search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Skriv för att söka"
              data-cy="organisation-search"
            />

            {searching && (
              <div className="flex justify-center py-8">
                <Spinner size={3} />
              </div>
            )}

            {!searching && options.length === 0 && (
              <p className="text-label-small text-dark-secondary">
                {term.trim().length < MIN_TERM ? 'Skriv minst två tecken.' : 'Inga institutioner matchar.'}
              </p>
            )}

            {options.length > 0 && (
              <Filter
                data-cy="organisation-options"
                className="[&_.sk-form-checkbox]:order-last [&_.sk-form-checkbox]:!mr-8"
              >
                <Filter.Label className="sr-only">Filtrera på institution</Filter.Label>
                {options.map((option) => (
                  <Filter.Item
                    key={option.id}
                    checked={selected.some((chosen) => chosen.id === option.id)}
                    labelPosition="left"
                    onChange={() => onToggle(option)}
                  >
                    {option.name}
                  </Filter.Item>
                ))}
              </Filter>
            )}
          </div>
        </PopupMenu.Panel>
      </PopupMenu>
    </div>
  );
};

export default OrganisationFilter;
