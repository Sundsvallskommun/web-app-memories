'use client';

import { useEffect, useState } from 'react';
import { Filter, FormLabel, Input, PopupMenu, Spinner } from '@sk-web-gui/react';
import { ChevronDown } from 'lucide-react';
import { OPEN_FILTER_BUTTON_CLASS } from '@components/search-filters/open-filter-button';
import { Place, getPlaces } from '@services/place-service';
import { PlaceCount } from '@data-contracts/document';
import { CHECKBOX_ALIGNMENT_CLASS } from '@components/search-filters/checkbox-alignment';

const MIN_TERM = 2;
const MAX_MATCHES = 50;

interface Props {
  counts?: PlaceCount[];
  selected: Place[];
  onToggle: (place: Place) => void;
}

interface BodyProps extends Props {
  hideLabel?: boolean;
}

const matchesFor = (places: Place[], term: string): Place[] => {
  const wanted = term.trim().toLocaleLowerCase('sv');
  if (wanted.length < MIN_TERM) return [];

  const found = places.filter((place) => place.name.toLocaleLowerCase('sv').includes(wanted));
  const startsWith = found.filter((place) => place.name.toLocaleLowerCase('sv').startsWith(wanted));
  const rest = found.filter((place) => !place.name.toLocaleLowerCase('sv').startsWith(wanted));
  return [...startsWith, ...rest].slice(0, MAX_MATCHES);
};

export const PlaceFilterBody: React.FC<BodyProps> = ({ counts, selected, onToggle, hideLabel }) => {
  const [term, setTerm] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getPlaces()
      .then((found) => {
        if (!cancelled) setPlaces(found);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const matches = matchesFor(places, term);
  const unlisted = selected.filter((option) => !matches.some((match) => match.id === option.id));
  const options = [...unlisted, ...matches];
  const hitsById = new Map((counts ?? []).map((place) => [place.id, place.count]));
  const labelFor = (place: Place) => (counts ? `${place.name} (${hitsById.get(place.id) ?? 0})` : place.name);

  return (
    <div className="flex flex-col gap-8">
      <FormLabel htmlFor="place-search" className={hideLabel ? 'sr-only' : undefined}>
        Plats
      </FormLabel>
      <Input
        id="place-search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Skriv för att söka"
        data-cy="place-search"
      />

      {loading && (
        <div className="flex justify-center py-8">
          <Spinner size={3} />
        </div>
      )}

      {!loading && failed && <p className="text-label-small text-dark-secondary">Platserna kunde inte hämtas.</p>}

      {!loading && !failed && options.length === 0 && term.trim().length >= MIN_TERM && (
        <p className="text-label-small text-dark-secondary">Inga platser matchar.</p>
      )}

      {options.length > 0 && (
        <Filter data-cy="place-options" className={CHECKBOX_ALIGNMENT_CLASS}>
          <Filter.Label className="sr-only">Filtrera på plats</Filter.Label>
          {options.map((option) => (
            <Filter.Item
              key={option.id}
              checked={selected.some((chosen) => chosen.id === option.id)}
              labelPosition="left"
              onChange={() => onToggle(option)}
            >
              <span className="flex flex-col">
                <span>{labelFor(option)}</span>
                {option.municipality && (
                  <span className="text-label-small text-dark-secondary">{option.municipality}</span>
                )}
              </span>
            </Filter.Item>
          ))}
        </Filter>
      )}
    </div>
  );
};

export const PlaceFilter: React.FC<Props> = (props) => (
  <div className="relative">
    <PopupMenu type="dialog">
      <PopupMenu.Button
        size="sm"
        variant="ghost"
        rightIcon={<ChevronDown size={18} />}
        className={OPEN_FILTER_BUTTON_CLASS}
        data-cy="place-filter"
      >
        Plats
      </PopupMenu.Button>

      <PopupMenu.Panel className="w-[320px] p-16">
        <PlaceFilterBody {...props} />
      </PopupMenu.Panel>
    </PopupMenu>
  </div>
);

export default PlaceFilter;
