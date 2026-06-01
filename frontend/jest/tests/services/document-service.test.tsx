import { searchDocuments } from '@services/document-service';
import { apiService } from '@services/api-service';

jest.mock('@services/api-service', () => ({
  apiService: { get: jest.fn() },
}));

const mockGet = apiService.get as jest.Mock;

describe('document-service.searchDocuments', () => {
  beforeEach(() => mockGet.mockReset());

  it('maps textTotal alongside the other per-type totals from the BFF response', async () => {
    mockGet.mockResolvedValue({
      data: {
        data: [{ id: 'text-1', title: 'Minne', type: 'Text' }],
        total: 42,
        totalPages: 5,
        filmTotal: 1,
        publicationTotal: 2,
        photoTotal: 3,
        objectTotal: 4,
        audioTotal: 5,
        textTotal: 9,
        page: 1,
        pageSize: 10,
        message: 'success',
      },
    });

    const result = await searchDocuments({ query: 'minne', type: 'Text' });

    expect(mockGet).toHaveBeenCalledWith('documents', {
      params: expect.objectContaining({ query: 'minne', type: 'Text' }),
    });
    expect(result.textTotal).toBe(9);
    expect(result.audioTotal).toBe(5);
    expect(result.total).toBe(42);
    expect(result.documents).toHaveLength(1);
  });

  it('defaults every total (including textTotal) to 0 when the response is empty', async () => {
    mockGet.mockResolvedValue({ data: undefined });

    const result = await searchDocuments({});

    expect(result.textTotal).toBe(0);
    expect(result.filmTotal).toBe(0);
    expect(result.documents).toEqual([]);
  });
});
