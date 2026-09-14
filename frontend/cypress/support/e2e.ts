import '@cypress/code-coverage/support';
import { addMatchImageSnapshotCommand } from '@simonsmith/cypress-image-snapshot/command';

import { getMe } from '../fixtures/getMe';
import { getDocuments } from '../fixtures/getDocuments';

localStorage.clear();

// Frontend-only E2E (no backend on :3001): the app re-throws a failed upstream
// fetch as an AxiosError "Network Error". API endpoints are mocked below; ignore
// any stray network error so it doesn't fail the run as an unhandled rejection,
// while still letting genuine app errors fail the test.
Cypress.on('uncaught:exception', (err) => !err.message?.includes('Network Error'));

beforeEach(() => {
  cy.intercept('GET', '**/api/me', getMe).as('getMe');
  cy.intercept('GET', '**/api/documents*', getDocuments).as('documents');
});

addMatchImageSnapshotCommand({
  failureThreshold: 0.05,
  failureThresholdType: 'percent',
  capture: 'viewport',
  comparisonMethod: 'ssim',
});
