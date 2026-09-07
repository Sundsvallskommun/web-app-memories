import { apiService } from '@services/api-service';

/** An organisation that created material, upstream's "legal entity". */
export interface Organisation {
  id: number;
  name: string;
  category?: string;
}

interface ListResponse {
  data: Organisation[];
  total: number;
}

interface SingleResponse {
  data: Organisation;
}

/**
 * Search organisations by name. Returns nothing for an empty term: there are
 * 6 607 of them, orderable only by name, so a default list opens on obscure
 * businesses rather than anything a user would pick.
 */
export const searchOrganisations = async (name: string): Promise<Organisation[]> => {
  if (!name.trim()) return [];

  const response = await apiService.get<ListResponse>('organisations', { params: { name: name.trim() } });
  return response?.data?.data ?? [];
};

/** A category of organisations, for the Verksamhetskategori filter. */
export interface OrganisationCategory {
  name: string;
  /** How many organisations it holds. */
  count: number;
  /** False when the archive would reject a search that wide. */
  supported: boolean;
}

/** The categories organisations are grouped into, with their sizes. */
export const getOrganisationCategories = async (): Promise<OrganisationCategory[]> => {
  const response = await apiService.get<{ data: OrganisationCategory[] }>('organisation-categories');
  return response?.data?.data ?? [];
};

/** One organisation by id, so a shared link can label its filter chips. */
export const getOrganisation = async (id: number): Promise<Organisation | null> => {
  try {
    const response = await apiService.get<SingleResponse>(`organisations/${id}`);
    return response?.data?.data ?? null;
  } catch {
    return null;
  }
};
