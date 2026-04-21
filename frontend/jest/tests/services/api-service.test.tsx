import { ApiResponse, handleError } from '@services/api-service';
import type { AxiosError } from 'axios';

describe('Api service', () => {
  beforeEach(() => {
    delete (window as unknown as Record<string, Location>).location;
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/dashboard',
        href: '',
      },
      writable: true,
    });
  });

  it('should throw the error', () => {
    const error = {
      response: {
        status: 401,
        data: {
          message: 'Unauthorized',
        },
      },
      config: {},
    } as AxiosError<ApiResponse>;

    expect(() => handleError(error)).toThrow();
  });

  it('should throw an error with a different status code', () => {
    const error = {
      response: {
        status: 500,
        data: {
          message: 'Server Error',
        },
      },
      config: {},
    } as AxiosError<ApiResponse>;

    expect(() => handleError(error)).toThrow();
  });

  it('should throw an error with no response data', () => {
    const error = {
      request: {},
      message: 'Network Error',
      config: {},
    } as AxiosError<ApiResponse>;

    expect(() => handleError(error)).toThrow();
  });
});
