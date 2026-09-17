import { ApiService } from '@services/api.service';
import { MUNICIPALITY_ID } from '@/config';
import { getApiBase } from '@/config/api-config';

interface UpstreamNode {
  id: number;
  name: string | null;
  nodeType: string | null;
}

interface NodeDetailResponse {
  node: UpstreamNode;
  /** From the root down to the node's parent. */
  path?: UpstreamNode[];
}

export interface Collection {
  /** The archive the object belongs to, for the result cards. */
  archive: string;
  /** Every level from the archive down, for the object view. */
  chain: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const apiService = new ApiService();
const cache = new Map<number, { collection: Promise<Collection | undefined>; loadedAt: number }>();

const toCollection = ({ node, path }: NodeDetailResponse): Collection | undefined => {
  const levels = [...(path ?? []), node]
    .filter(level => level && level.nodeType !== 'Root')
    .map(level => ({ nodeType: level.nodeType, name: level.name?.trim() ?? '' }))
    .filter(level => level.name);
  if (levels.length === 0) return undefined;

  const archive = levels.find(level => level.nodeType === 'Arkiv') ?? levels[0];
  return { archive: archive.name, chain: levels.map(level => level.name).join(' > ') };
};

/** The archive and series an object sits in. Cached, since a page of hits often shares one. */
export const getCollection = (nodeId: number | null | undefined): Promise<Collection | undefined> => {
  if (!nodeId) return Promise.resolve(undefined);

  const cached = cache.get(nodeId);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached.collection;

  const url = `${getApiBase('memories')}/${MUNICIPALITY_ID}/nodes/${nodeId}`;
  const collection = apiService
    .get<NodeDetailResponse>({ url })
    .then(res => toCollection(res.data))
    .catch(() => {
      cache.delete(nodeId);
      return undefined;
    });

  cache.set(nodeId, { collection, loadedAt: Date.now() });
  return collection;
};
