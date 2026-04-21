export const apiURL = (...parts: string[]): string => {
  const base = process.env.NEXT_PUBLIC_API_URL || '/api';
  // Strip surrounding slashes from each part so we can rejoin cleanly.
  const segments = [base, ...parts].map((p) => p?.replace(/(^\/|\/$)/g, '') || '');
  const joined = segments.filter(Boolean).join('/');
  // If base wasn't an absolute URL (e.g. "/api"), force a leading slash so axios
  // treats it as origin-relative — otherwise it resolves against the current page
  // URL and you get nonsense like /dokument/api/documents/film-43.
  if (/^https?:\/\//i.test(joined)) return joined;
  return '/' + joined;
};
