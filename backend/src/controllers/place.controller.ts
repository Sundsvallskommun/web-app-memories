import { Controller, Get, Res } from 'routing-controllers';
import { Response } from 'express';
import { ApiService } from '@services/api.service';
import { MUNICIPALITY_ID } from '@/config';
import { getApiBase } from '@/config/api-config';

interface UpstreamTopography {
  topographyId: number;
  code: string | null;
  name: string | null;
  displayName: string | null;
  place: string | null;
  municipality: string | null;
}

export interface Place {
  id: number;
  name: string;
  municipality?: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cached: { places: Place[]; loadedAt: number } | undefined;
let loading: Promise<Place[]> | undefined;

@Controller()
export class PlaceController {
  private readonly apiService = new ApiService();

  /**
   * Every place in the topography register, for the Plats filter. The list is
   * small and rarely changes, so it is fetched once a day and searched in the
   * browser.
   */
  @Get('/places')
  async listPlaces(@Res() response: Response) {
    const places = await this.getPlaces();
    return response.send({ data: places, total: places.length, message: 'success' });
  }

  private async getPlaces(): Promise<Place[]> {
    if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached.places;

    loading ??= this.fetchPlaces()
      .then(places => {
        cached = { places, loadedAt: Date.now() };
        return places;
      })
      .finally(() => {
        loading = undefined;
      });
    return loading;
  }

  private async fetchPlaces(): Promise<Place[]> {
    const url = `${getApiBase('memories')}/${MUNICIPALITY_ID}/topographies`;
    const res = await this.apiService.get<UpstreamTopography[]>({ url });

    return (res.data ?? [])
      .map(topography => ({
        id: topography.topographyId,
        name: (topography.displayName || topography.name || topography.place || '').trim(),
        municipality: topography.municipality?.trim() || undefined,
      }))
      .filter(place => place.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'sv'));
  }
}
