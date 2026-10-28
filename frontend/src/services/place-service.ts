import { apiService } from '@services/api-service';

export interface Place {
  id: number;
  name: string;
  municipality?: string;
}

let places: Promise<Place[]> | undefined;

export const getPlaces = (): Promise<Place[]> => {
  places ??= apiService
    .get<{ data: Place[] }>('places')
    .then((response) => response?.data?.data ?? [])
    .catch((error) => {
      places = undefined;
      throw error;
    });
  return places;
};
