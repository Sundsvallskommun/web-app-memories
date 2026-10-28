'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Filter, FormLabel, Input, PopupMenu, Spinner } from '@sk-web-gui/react';
import { ChevronDown } from 'lucide-react';
import { OPEN_FILTER_BUTTON_CLASS } from '@components/search-filters/open-filter-button';
import { Organisation, searchOrganisations } from '@services/organisation-service';
import { CHECKBOX_ALIGNMENT_CLASS } from '@components/search-filters/checkbox-alignment';

const MIN_TERM = 2;
const DEBOUNCE_MS = 300;

/** Upstream pages can overlap when the register changes between two fetches. */
const appendNew = (shown: Organisation[], more: Organisation[]): Organisation[] => {
  const seen = new Set(shown.map((organisation) => organisation.id));
  return [...shown, ...more.filter((organisation) => !seen.has(organisation.id))];
};

interface Props {
  selected: Organisation[];
  onToggle: (organisation: Organisation) => void;
}

interface BodyProps extends Props {
  hideLabel?: boolean;
  /** Keeps a long list inside the window. Grabbing the page scrollbar would close the popup. */
  scrollList?: boolean;
}

export const OrganisationFilterBody: React.FC<BodyProps> = ({ selected, onToggle, hideLabel, scrollList }) => {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Organisation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // A page that lands after the term changed belongs to the old search.
  const activeTerm = useRef('');

  useEffect(() => {
    const trimmed = term.trim();
    activeTerm.current = trimmed;
    setPage(1);
    if (trimmed.length < MIN_TERM) {
      setResults([]);
      setTotal(0);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      searchOrganisations(trimmed)
        .then((found) => {
          if (cancelled) return;
          setResults(found.organisations);
          setTotal(found.total);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
          setTotal(0);
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

  const showMore = () => {
    const searchedTerm = activeTerm.current;
    setLoadingMore(true);
    searchOrganisations(searchedTerm, page + 1)
      .then((found) => {
        if (activeTerm.current !== searchedTerm) return;
        setResults((shown) => appendNew(shown, found.organisations));
        setTotal(found.total);
        setPage(page + 1);
      })
      .catch(() => {
        // The list already shown stays usable, and the button lets the user try again.
      })
      .finally(() => setLoadingMore(false));
  };

  const unlisted = selected.filter((option) => !results.some((result) => result.id === option.id));
  const options = [...unlisted, ...results];
  const hasMore = results.length < total;

  return (
    <div className="flex flex-col gap-8">
      <FormLabel htmlFor="organisation-search" className={hideLabel ? 'sr-only' : undefined}>
        Arkivbildare
      </FormLabel>
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

      {!searching && options.length === 0 && term.trim().length >= MIN_TERM && (
        <p className="text-label-small text-dark-secondary">Inga arkivbildare matchar.</p>
      )}

      {options.length > 0 && (
        <div
          data-cy="organisation-list"
          className={`flex flex-col gap-8 ${scrollList ? 'max-h-[50vh] overflow-y-auto' : ''}`}
        >
          <Filter data-cy="organisation-options" className={CHECKBOX_ALIGNMENT_CLASS}>
            <Filter.Label className="sr-only">Filtrera på arkivbildare</Filter.Label>
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

          {(hasMore || page > 1) && (
            <div className="flex flex-col items-center gap-8 pb-4 text-center">
              <p className="text-label-small text-dark-secondary" aria-live="polite" data-cy="organisation-count">
                Visar {results.length} av {total}
              </p>
              {hasMore && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={showMore}
                  loading={loadingMore}
                  loadingText="Hämtar"
                  data-cy="organisation-show-more"
                  className="w-full"
                >
                  Visa fler
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const OrganisationFilter: React.FC<Props> = (props) => (
  <div className="relative">
    <PopupMenu type="dialog">
      <PopupMenu.Button
        size="sm"
        variant="ghost"
        rightIcon={<ChevronDown size={18} />}
        className={OPEN_FILTER_BUTTON_CLASS}
        data-cy="organisation-filter"
      >
        Arkivbildare
      </PopupMenu.Button>

      <PopupMenu.Panel className="w-[320px] p-16">
        <OrganisationFilterBody {...props} scrollList />
      </PopupMenu.Panel>
    </PopupMenu>
  </div>
);

export default OrganisationFilter;
