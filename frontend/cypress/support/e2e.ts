import '@cypress/code-coverage/support';
import { addMatchImageSnapshotCommand } from '@simonsmith/cypress-image-snapshot/command';

import { CookieConsentUtils } from '@sk-web-gui/react';
import { getMe } from '../fixtures/getMe';

export const DEFAULT_COOKIE_VALUE = 'necessary%2Cstats';

localStorage.clear();

beforeEach(() => {
  cy.setCookie(CookieConsentUtils.defaultCookieConsentName, DEFAULT_COOKIE_VALUE);
  cy.intercept('GET', '**/api/me', getMe).as('getMe');
});

addMatchImageSnapshotCommand({
  failureThreshold: 0.05,
  failureThresholdType: 'percent',
  capture: 'viewport',
  comparisonMethod: 'ssim',
});
