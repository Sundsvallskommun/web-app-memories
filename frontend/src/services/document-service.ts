import { Document, SearchParams, SearchResult } from '@data-contracts/document';
import { apiService } from '@services/api-service';

interface ApiResponse {
  data: Document[];
  total: number;
  totalPages: number;
  filmTotal: number;
  publicationTotal: number;
  photoTotal: number;
  objectTotal: number;
  audioTotal: number;
  page: number;
  pageSize: number;
  message: string;
}

export const searchDocuments = async (params: SearchParams): Promise<SearchResult> => {
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;

  const queryParams: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  };
  if (params.query) queryParams.query = params.query;
  if (params.type) queryParams.type = params.type;
  if (params.sortBy) queryParams.sortBy = params.sortBy;
  if (params.sortDirection) queryParams.sortDirection = params.sortDirection;

  const response = await apiService.get<ApiResponse>('documents', { params: queryParams });
  const data = response?.data;

  return {
    documents: data?.data || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 0,
    page,
    pageSize,
    filmTotal: data?.filmTotal || 0,
    publicationTotal: data?.publicationTotal || 0,
    photoTotal: data?.photoTotal || 0,
    objectTotal: data?.objectTotal || 0,
    audioTotal: data?.audioTotal || 0,
  };
};

export const getDocumentById = async (id: string): Promise<Document | null> => {
  try {
    const response = await apiService.get<{ data: Document; message: string }>(`documents/${id}`);
    return response?.data?.data || null;
  } catch {
    return null;
  }
};
