'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** sk-web-gui breakpoints, which are not Tailwind's defaults. */
export const BELOW_MD = '(max-width: 767px)';

/**
 * Matches a CSS media query, false while server-rendering. Used where a layout
 * has to swap components rather than hide them with CSS, so the two variants
 * never both exist in the DOM.
 */
export const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
};
