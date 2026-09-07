import { Controller, Get, Param, QueryParam, Res } from 'routing-controllers';
import { Response } from 'express';
import { ApiService } from '@services/api.service';
import { HttpException } from '@/exceptions/HttpException';
import { MUNICIPALITY_ID } from '@/config';
import { getApiBase } from '@/config/api-config';
import { getCategories, getEntitiesInCategory } from '@services/legal-entity-index.service';

interface UpstreamLegalEntity {
  legalEntityId: number;
  name: string | null;
  category: string | null;
}

interface PagedLegalEntityResponse {
  legalEntities?: UpstreamLegalEntity[];
  _meta?: { totalRecords?: number };
}

export interface Organisation {
  id: number;
  name: string;
  category?: string;
}

const MAX_RESULTS = 20;

const toOrganisation = (entity: UpstreamLegalEntity): Organisation => ({
  id: entity.legalEntityId,
  name: entity.name || '(utan namn)',
  category: entity.category || undefined,
});

@Controller()
export class LegalEntityController {
  private readonly apiService = new ApiService();

  /** Search organisations by name, for the Institution filter's picker. */
  @Get('/organisations')
  async searchOrganisations(
    @QueryParam('name') name: string,
    @QueryParam('category') category: string,
    @QueryParam('limit') limit: number = MAX_RESULTS,
    @Res() response: Response,
  ) {
    const trimmed = name?.trim();
    const trimmedCategory = category?.trim();
    // Without a term the only available ordering is alphabetical, which is
    // useless as a starting list, so say so rather than returning noise.
    if (!trimmed && !trimmedCategory) {
      return response.send({ data: [], total: 0, message: 'success' });
    }

    if (trimmedCategory) {
      const inCategory = await getEntitiesInCategory(trimmedCategory, trimmed);
      return response.send({ data: inCategory, total: inCategory.length, message: 'success' });
    }

    const params = new URLSearchParams({
      page: '1',
      limit: String(Math.min(Math.max(1, limit), 100)),
      sortBy: 'name',
      sortDirection: 'ASC',
      name: trimmed,
    });

    const url = `${getApiBase('memories')}/${MUNICIPALITY_ID}/legal-entities?${params.toString()}`;
    const res = await this.apiService.get<PagedLegalEntityResponse>({ url });

    return response.send({
      data: (res.data.legalEntities ?? []).map(toOrganisation),
      total: res.data._meta?.totalRecords ?? 0,
      message: 'success',
    });
  }

  /**
   * The categories organisations are grouped into, for the Verksamhetskategori
   * filter. Resolved from our own index: upstream returns a category on every
   * organisation but cannot filter on one.
   */
  @Get('/organisation-categories')
  async listCategories(@Res() response: Response) {
    const categories = await getCategories();
    return response.send({ data: categories, total: categories.length, message: 'success' });
  }

  /**
   * One organisation by id. The filter keeps only ids in the URL, so a shared
   * link has to look the names back up to label its chips.
   */
  @Get('/organisations/:id')
  async getOrganisationById(@Param('id') id: string, @Res() response: Response) {
    if (!/^\d+$/.test(id)) throw new HttpException(400, `Invalid organisation id: ${id}`);

    const url = `${getApiBase('memories')}/${MUNICIPALITY_ID}/legal-entities/${id}`;
    const res = await this.apiService.get<UpstreamLegalEntity>({ url });

    return response.send({ data: toOrganisation(res.data), message: 'success' });
  }
}
