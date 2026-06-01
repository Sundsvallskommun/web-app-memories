describe('Search landing page', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('renders the heading, main content and source-type filters (including Text)', () => {
    cy.get('h1').should('contain.text', 'Sundsvallsminnen');
    cy.get('main#content').should('exist');
    // Source-type filter row with a chip per source — Text is the new one.
    cy.contains('Källtyp:').should('be.visible');
    cy.contains('Text (').should('exist');
  });
});
