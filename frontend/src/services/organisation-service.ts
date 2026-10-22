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

export interface OrganisationPage {
  organisations: Organisation[];
  total: number;
}

/** One page of matches. The BFF caps a page, so `total` says whether there are more. */
export const searchOrganisations = async (name: string, page = 1): Promise<OrganisationPage> => {
  if (!name.trim()) return { organisations: [], total: 0 };

  const response = await apiService.get<ListResponse>('organisations', { params: { name: name.trim(), page } });
  return { organisations: response?.data?.data ?? [], total: response?.data?.total ?? 0 };
};

export const getOrganisation = async (id: number): Promise<Organisation | null> => {
  try {
    const response = await apiService.get<SingleResponse>(`organisations/${id}`);
    return response?.data?.data ?? null;
  } catch {
    return null;
  }
};
