// Minimal mocked response for the BFF `/documents` search endpoint, used in E2E
// where only the frontend runs (no backend on :3001). Shape matches the BFF
// payload consumed by `searchDocuments` (per-type totals incl. textTotal).
export const getDocuments = {
  data: [],
  total: 0,
  totalPages: 0,
  filmTotal: 0,
  publicationTotal: 0,
  photoTotal: 0,
  objectTotal: 0,
  audioTotal: 0,
  textTotal: 0,
  page: 1,
  pageSize: 10,
  message: 'success',
};
