import { ApiService } from '@services/api.service';
import { MUNICIPALITY_ID } from '@/config';
import { getApiBase } from '@/config/api-config';

interface UpstreamLegalEntity {
  legalEntityId: number;
  name: string | null;
  category: string | null;
}

interface PagedLegalEntityResponse {
  legalEntities?: UpstreamLegalEntity[];
  _meta?: { totalRecords?: number };
}

export interface IndexedEntity {
  id: number;
  name: string;
  category: string;
}

export interface CategorySummary {
  name: string;
  /** How many organisations it holds, which is how many ids a filter on it sends. */
  count: number;
  /** False when the archive would reject a search that wide. */
  supported: boolean;
}

const PAGE_SIZE = 1000;
/** A guard against paging forever if upstream ever stops honouring the page size. */
const MAX_PAGES = 20;
/**
 * The most creatorLegalEntityId values one search can carry. Measured against
 * the gateway: 200 goes through, 225 comes back as a 400.
 */
export const MAX_CREATOR_IDS = 200;

const UNCATEGORISED = 'Utan kategori';

const apiService = new ApiService();

let index: IndexedEntity[] | null = null;
let loading: Promise<IndexedEntity[]> | null = null;

const fetchAll = async (): Promise<IndexedEntity[]> => {
  const entities: IndexedEntity[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sortBy: 'name',
      sortDirection: 'ASC',
    });

    const url = `${getApiBase('memories')}/${MUNICIPALITY_ID}/legal-entities?${params.toString()}`;
    const res = await apiService.get<PagedLegalEntityResponse>({ url });
    const rows = res.data.legalEntities ?? [];

    for (const row of rows) {
      entities.push({
        id: row.legalEntityId,
        name: row.name || '(utan namn)',
        category: row.category?.trim() || UNCATEGORISED,
      });
    }

    const total = res.data._meta?.totalRecords ?? 0;
    if (rows.length === 0 || entities.length >= total) break;
  }

  return entities;
};

/** Loads once, and only when something actually asks for a category. */
export const getLegalEntityIndex = async (): Promise<IndexedEntity[]> => {
  if (index) return index;

  // Concurrent callers share one load rather than each starting their own.
  loading ??= fetchAll().then(entities => {
    index = entities;
    loading = null;
    return entities;
  });

  return loading;
};

export const getCategories = async (): Promise<CategorySummary[]> => {
  const entities = await getLegalEntityIndex();
  const counts = new Map<string, number>();

  for (const entity of entities) {
    counts.set(entity.category, (counts.get(entity.category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, supported: count <= MAX_CREATOR_IDS }))
    .sort((a, b) => a.name.localeCompare(b.name, 'sv'));
};

/** The organisation ids in a category, which is what the search filters on. */
export const getEntityIdsInCategories = async (categories: string[]): Promise<number[]> => {
  const wanted = new Set(categories.map(category => category.trim()).filter(Boolean));
  if (wanted.size === 0) return [];

  const entities = await getLegalEntityIndex();
  return entities.filter(entity => wanted.has(entity.category)).map(entity => entity.id);
};

/** The organisations in a category, optionally narrowed by a name fragment. */
export const getEntitiesInCategory = async (category: string, name?: string): Promise<IndexedEntity[]> => {
  const entities = await getLegalEntityIndex();
  const term = name?.trim().toLowerCase();

  return entities.filter(
    entity => entity.category === category.trim() && (!term || entity.name.toLowerCase().includes(term)),
  );
};
