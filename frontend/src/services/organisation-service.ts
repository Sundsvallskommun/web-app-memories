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
