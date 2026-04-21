'use client';

import { apiURL } from '@utils/api-url';
import { protectedRoutes } from '@utils/protected-routes';
import axios, { AxiosError } from 'axios';

export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
}

export const handleError = (error: AxiosError<ApiResponse>) => {
  if (!protectedRoutes.includes(window?.location.pathname)) throw error;

  if (error?.response?.status === 401 && !window?.location.pathname.includes('login')) {
    const path = encodeURIComponent(window.location.pathname);
    const failMessage = encodeURIComponent(error.response.data.message ?? '');
    window.location.href = `/login?path=${path}&failMessage=${failMessage}`;
  }

  throw error;
};

const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
};

const get = <T>(url: string, options?: { [key: string]: unknown }) =>
  axios.get<T>(apiURL(url), { ...defaultOptions, ...options }).catch(handleError);

const post = <T, D = unknown>(url: string, data?: D, options?: { [key: string]: unknown }) =>
  axios.post<T>(apiURL(url), data, { ...defaultOptions, ...options }).catch(handleError);

const put = <T, D = unknown>(url: string, data?: D, options?: { [key: string]: unknown }) =>
  axios.put<T>(apiURL(url), data, { ...defaultOptions, ...options }).catch(handleError);

const patch = <T, D = unknown>(url: string, data?: D, options?: { [key: string]: unknown }) =>
  axios.patch<T>(apiURL(url), data, { ...defaultOptions, ...options }).catch(handleError);

const remove = <T>(url: string, options?: { [key: string]: unknown }) =>
  axios.delete<T>(apiURL(url), { ...defaultOptions, ...options }).catch(handleError);

export const apiService = { get, post, put, patch, delete: remove };
