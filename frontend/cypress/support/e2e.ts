import '@cypress/code-coverage/support';
import { addMatchImageSnapshotCommand } from '@simonsmith/cypress-image-snapshot/command';

import { CookieConsentUtils } from '@sk-web-gui/react';
import { getMe } from '../fixtures/getMe';
import { getDocuments } from '../fixtures/getDocuments';

export const DEFAULT_COOKIE_VALUE = 'necessary%2Cstats';

localStorage.clear();

// Frontend-only E2E (no backend on :3001): the app re-throws a failed upstream
// fetch as an AxiosError "Network Error". API endpoints are mocked below; ignore
// any stray network error so it doesn't fail the run as an unhandled rejection,
// while still letting genuine app errors fail the test.
Cypress.on('uncaught:exception', (err) => !err.message?.includes('Network Error'));

beforeEach(() => {
  cy.setCookie(CookieConsentUtils.defaultCookieConsentName, DEFAULT_COOKIE_VALUE);
  cy.intercept('GET', '**/api/me', getMe).as('getMe');
  cy.intercept('GET', '**/api/documents*', getDocuments).as('documents');
});

addMatchImageSnapshotCommand({
  failureThreshold: 0.05,
  failureThresholdType: 'percent',
  capture: 'viewport',
  comparisonMethod: 'ssim',
});
