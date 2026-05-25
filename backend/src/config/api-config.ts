import { API_BASE_URL } from '@/config';

export const APIS = [{ name: 'memories', version: '3.2' }] as const;

export type ApiName = (typeof APIS)[number]['name'];

export const getApiBase = (name: ApiName): string => {
  const api = APIS.find(a => a.name === name);
  return `${api?.name}/${api?.version}`;
};

export const apiURL = (...parts: string[]): string => {
  const urlParts = [API_BASE_URL, ...parts];
  return urlParts
    .map(part => part?.replace(/(^\/|\/$)/g, ''))
    .filter(Boolean)
    .join('/');
};
