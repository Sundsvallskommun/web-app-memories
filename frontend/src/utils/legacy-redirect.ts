import { DocumentType } from '@data-contracts/document';
import { parseYear } from '@utils/search-params';

/**
 * Translates addresses from the old search service on sok.sundsvallsminnen.se to the new app.
 * The old WordPress site links to them in hundreds of places, and so do Google and bookmarks.
 *
 * `permanent` is false where the target is only a fallback, so browsers do not cache a
 * redirect to the start page that a later mapping should replace.
 */
export interface LegacyRedirect {
  pathname: string;
  search: string;
  permanent: boolean;
}

/** `TES` on /dokument/info?AID=N. Dimgp is the page image of a publication, publ-14999 is a newspaper page. */
const TES_PREFIXES: Record<string, string> = {
  dtext: 'text',
  dtextp: 'publ',
  dimgp: 'publ',
};

/** `TYP` on /dokument/info?JID=N. Objects share the photo- prefix. TYP=Dokument uses other numbering and is left out. */
const TYP_PREFIXES: Record<string, string> = {
  publikationer: 'publ',
  text: 'text',
  film: 'film',
  ljud: 'audio',
  föremål: 'photo',
};

/** Codes we know the type of but not how their numbers map, so they land on a filtered search. */
const TES_FALLBACK_TYPES: Record<string, DocumentType> = {
  dfilm: 'Film',
};

/** `databas` on /dokument/results. */
const DATABASE_TYPES: Record<string, DocumentType> = {
  text: 'Text',
  publikationer: 'Publication',
  foto: 'Photo',
  film: 'Film',
  ljud: 'Audio',
  föremål: 'Object',
};

const SEARCH_PAGE_TYPES: Record<string, DocumentType | undefined> = {
  '/dokument/search': undefined,
  '/person/search': 'Person',
  '/jurpers/search': 'LegalEntity',
  '/arkiv/search': undefined,
};

const ARCHIVE_PATHS = new Set(['/arkiv/info', '/arkiv/serie', '/arkiv/volym', '/arkiv/results']);

/** The old service was not strict about case, so neither are we. */
const lowerCaseParams = (params: URLSearchParams): Map<string, string> => {
  const lowered = new Map<string, string>();
  params.forEach((value, key) => {
    const name = key.toLowerCase();
    if (!lowered.has(name)) lowered.set(name, value.trim());
  });
  return lowered;
};

const toSearch = (entries: Record<string, string | undefined>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};

const isId = (value?: string): value is string => !!value && /^[1-9]\d*$/.test(value);

/** Some WordPress links have the whole address pasted again after the code, as in TES=Dtextphttp://... */
const cleanCode = (value?: string): string => (value ?? '').replace(/https?:.*$/i, '').toLowerCase();

/** The old form took full dates in ar1 and ar2, the new one takes years. */
const yearOf = (value?: string): string | undefined => {
  const year = parseYear(value?.match(/^\d{4}/)?.[0] ?? null);
  return year ? String(year) : undefined;
};

const startPage = (permanent: boolean, type?: DocumentType): LegacyRedirect => ({
  pathname: '/',
  search: toSearch({ type }),
  permanent,
});

const documentPage = (prefix: string, id: string): LegacyRedirect => ({
  pathname: `/dokument/${prefix}-${id}`,
  search: '',
  permanent: true,
});

const fromDocumentInfo = (params: Map<string, string>): LegacyRedirect => {
  const aid = params.get('aid');
  const tes = cleanCode(params.get('tes'));

  if (isId(aid)) {
    if (tes === 'dbio' && params.get('val')?.toLowerCase() === 'jurpers') return documentPage('jurpers', aid);
    if (TES_PREFIXES[tes]) return documentPage(TES_PREFIXES[tes], aid);
    if (TES_FALLBACK_TYPES[tes]) return startPage(false, TES_FALLBACK_TYPES[tes]);
  }

  const jid = params.get('jid');
  const typ = cleanCode(params.get('typ'));
  if (isId(jid) && TYP_PREFIXES[typ]) return documentPage(TYP_PREFIXES[typ], jid);

  return startPage(false);
};

const fromPersonInfo = (params: Map<string, string>): LegacyRedirect => {
  const pid = params.get('pid');
  if (params.get('per')?.toLowerCase() === 'person' && params.get('jid') === '1' && isId(pid)) {
    return documentPage('person', pid);
  }
  return startPage(false);
};

const fromDocumentResults = (params: Map<string, string>): LegacyRedirect => ({
  pathname: '/',
  search: toSearch({
    q: params.get('frisok'),
    type: DATABASE_TYPES[params.get('databas')?.toLowerCase() ?? ''],
    from: yearOf(params.get('ar1')),
    to: yearOf(params.get('ar2')),
    creator: params.get('upphovsman'),
  }),
  permanent: true,
});

/**
 * Strips a locale prefix so the rules match, and puts it back on the target. The default locale
 * is served without a prefix, so keeping it would only add a second redirect.
 */
const splitLocale = (pathname: string, locales: string[], defaultLocale?: string): { prefix: string; path: string } => {
  const [, first, ...rest] = pathname.split('/');
  if (!locales.includes(first)) return { prefix: '', path: pathname };
  return { prefix: first === defaultLocale ? '' : `/${first}`, path: `/${rest.join('/')}` };
};

/** Returns where an old address should go, or null when the path is not one of the old ones. */
export const legacyRedirect = (
  pathname: string,
  searchParams: URLSearchParams,
  locales: string[] = [],
  defaultLocale?: string
): LegacyRedirect | null => {
  const { prefix, path } = splitLocale(pathname, locales, defaultLocale);
  const route = path.toLowerCase().replace(/\/+$/, '');
  const params = lowerCaseParams(searchParams);

  let target: LegacyRedirect | null = null;
  if (route === '/dokument/info') target = fromDocumentInfo(params);
  else if (route === '/person/info') target = fromPersonInfo(params);
  else if (route === '/dokument/results') target = fromDocumentResults(params);
  else if (route in SEARCH_PAGE_TYPES) target = startPage(true, SEARCH_PAGE_TYPES[route]);
  else if (ARCHIVE_PATHS.has(route)) target = startPage(true);

  if (!target) return null;
  return { ...target, pathname: prefix && target.pathname === '/' ? prefix : `${prefix}${target.pathname}` };
};
