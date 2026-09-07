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

export const getOrganisation = async (id: number): Promise<Organisation | null> => {
  try {
    const response = await apiService.get<SingleResponse>(`organisations/${id}`);
    return response?.data?.data ?? null;
  } catch {
    return null;
  }
};
