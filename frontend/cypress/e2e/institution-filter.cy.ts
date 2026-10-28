import { getDocuments } from '../fixtures/getDocuments';

const INSTITUTION_COUNTS = [
  { id: 2, name: 'Kommunarkivet', count: 5 },
  { id: 43, name: 'Sundsvalls museum', count: 3 },
  { id: 90, name: 'Krigsarkivet', count: 0 },
];

describe('Institution filter', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/documents*', { ...getDocuments, institutionCounts: INSTITUTION_COUNTS }).as(
      'search'
    );
  });

  describe('on desktop', () => {
    beforeEach(() => {
      // Wide enough for the whole filter row, so Institution is not moved into "Fler filter".
      cy.viewport(1920, 900);
    });

    it('offers the institutions that have hits, with their counts', () => {
      cy.visit('/');
      cy.get('[data-cy="institution-filter"]').should('have.text', 'Institution').click();

      cy.get('[data-cy="institution-filter-list"] input[type="checkbox"]').should('have.length', 2);
      cy.get('[data-cy="institution-filter-list"]').should('contain.text', 'Kommunarkivet (5)');
      cy.get('[data-cy="institution-filter-list"]').should('not.contain.text', 'Krigsarkivet');
    });

    it('searches on the chosen institution and shows it as a chip', () => {
      cy.intercept(
        { method: 'GET', pathname: '/api/documents', query: { institution: '43' } },
        { ...getDocuments, institutionCounts: INSTITUTION_COUNTS }
      ).as('filtered');

      cy.visit('/');
      cy.get('[data-cy="institution-filter"]').click();
      cy.get('[data-cy="institution-filter-list"]').contains('Sundsvalls museum').click();

      cy.wait('@filtered');
      cy.location('search').should('eq', '?institution=43');
      cy.get('[aria-label="Ta bort filtret Institution: Sundsvalls museum"]').should('exist');

      cy.get('[aria-label="Rensa alla filter"]').click();
      cy.location('search').should('eq', '');
    });

    it('keeps the choice from a shared link, named once the counts arrive', () => {
      cy.visit('/?institution=2,43');
      cy.wait('@search').its('request.query.institution').should('eq', '2,43');
      cy.get('[aria-label="Ta bort filtret Institution: Kommunarkivet"]').should('exist');
      cy.get('[aria-label="Ta bort filtret Institution: Sundsvalls museum"]').should('exist');
    });
  });

  describe('on mobile', () => {
    it('is a row in the filter modal', () => {
      cy.viewport(390, 844);
      cy.visit('/');
      cy.get('[data-cy="filters-modal-button"]').click();
      cy.get('[data-cy="filters-modal"]').should('contain.text', 'Institution');
      cy.get('[data-cy="filter-row-institution"]').click();
      cy.get('[data-cy="institution-filter-list"]').contains('Kommunarkivet').click();
      cy.get('[data-cy="filters-apply"]').click();

      cy.location('search').should('eq', '?institution=2');
    });
  });
});
