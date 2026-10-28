describe('Search landing page', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('renders the heading, main content and the type filter (including Text)', () => {
    cy.get('h1').should('contain.text', 'Sundsvallsminnen');
    cy.get('main#content').should('exist');
    cy.get('[data-cy="type-filter"]').should('be.visible').click();
    cy.get('[data-cy="type-filter-list"]').should('contain.text', 'Text (');
  });
});
