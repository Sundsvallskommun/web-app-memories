const PAGE_SIZE = 20;

const ORGANISATIONS = Array.from({ length: 45 }, (_, index) => ({
  id: 9000 + index,
  name: `Föreningen nummer ${String(index + 1).padStart(2, '0')}`,
}));

const FIRST_PAGE_LAST = ORGANISATIONS[PAGE_SIZE - 1];

describe('Arkivbildare filter', () => {
  beforeEach(() => {
    cy.intercept('GET', /\/organisations\?/, (req) => {
      const matches = String(req.query.name).toLowerCase() === 'för' ? ORGANISATIONS : [];
      const page = Number(req.query.page) || 1;
      const data = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      req.reply({ data, total: matches.length, message: 'success' });
    }).as('searchOrganisations');
    cy.intercept('GET', /\/organisations\/\d+$/, { data: FIRST_PAGE_LAST, message: 'success' });
  });

  describe('on desktop', () => {
    beforeEach(() => {
      // Short enough that a long list would run below the window.
      cy.viewport(1440, 800);
      cy.visit('/');
    });

    it('is called Arkivbildare', () => {
      cy.get('[data-cy="organisation-filter"]').should('have.text', 'Arkivbildare').click();
      cy.get('label[for="organisation-search"]').should('have.text', 'Arkivbildare');
    });

    it('keeps a long list inside the window, so the last one can be chosen', () => {
      cy.get('[data-cy="organisation-filter"]').click();
      cy.get('[data-cy="organisation-search"]').type('för');
      cy.wait('@searchOrganisations');

      cy.get('[data-cy="organisation-list"]').then(($list) => {
        const list = $list[0];
        expect(list.getBoundingClientRect().bottom).to.be.at.most(Cypress.config('viewportHeight'));
        expect(list.scrollHeight).to.be.greaterThan(list.clientHeight);
      });

      cy.get('[data-cy="organisation-options"]').contains(FIRST_PAGE_LAST.name).scrollIntoView().click();
      cy.get(`[aria-label="Ta bort filtret Arkivbildare: ${FIRST_PAGE_LAST.name}"]`).should('exist');
    });

    it('fetches the next page until every match is shown', () => {
      cy.get('[data-cy="organisation-filter"]').click();
      cy.get('[data-cy="organisation-search"]').type('för');
      cy.wait('@searchOrganisations');

      cy.get('[data-cy="organisation-count"]').should('have.text', 'Visar 20 av 45');
      cy.get('[data-cy="organisation-show-more"]').scrollIntoView().click();
      cy.get('[data-cy="organisation-count"]').should('have.text', 'Visar 40 av 45');
      cy.get('[data-cy="organisation-show-more"]').scrollIntoView().click();
      cy.get('[data-cy="organisation-count"]').should('have.text', 'Visar 45 av 45');

      cy.get('[data-cy="organisation-show-more"]').should('not.exist');
      cy.get('[data-cy="organisation-options"] input[type="checkbox"]').should('have.length', 45);
    });

    it('says when nothing matches', () => {
      cy.get('[data-cy="organisation-filter"]').click();
      cy.get('[data-cy="organisation-search"]').type('xyz');
      cy.wait('@searchOrganisations');
      cy.contains('Inga arkivbildare matchar.').should('be.visible');
      cy.get('[data-cy="organisation-count"]').should('not.exist');
    });
  });

  describe('on mobile', () => {
    beforeEach(() => {
      cy.viewport(390, 844);
      cy.visit('/');
      cy.get('[data-cy="filters-modal-button"]').click();
      cy.get('[data-cy="filters-modal"]').should('contain.text', 'Arkivbildare');
      cy.get('[data-cy="filter-row-organisation"]').click();
    });

    it('grows the list in the modal instead of scrolling it on its own', () => {
      cy.get('[data-cy="organisation-search"]').type('för');
      cy.wait('@searchOrganisations');
      cy.get('[data-cy="organisation-show-more"]').scrollIntoView().click();
      cy.get('[data-cy="organisation-count"]').should('have.text', 'Visar 40 av 45');

      cy.get('[data-cy="organisation-list"]').should(($list) => {
        expect(getComputedStyle($list[0]).maxHeight).to.equal('none');
      });
    });
  });
});
