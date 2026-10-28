describe('Om webbplatsen', () => {
  beforeEach(() => {
    cy.visit('/om-webbplatsen');
  });

  it('shows the text from the old site and links the two documents', () => {
    cy.get('h1').should('contain.text', 'Om Sundsvallsminnen');
    cy.get('[data-cy="about-content"]').should('contain.text', 'Sundsvalls kommunarkiv');

    cy.get('[data-cy="about-read-more"]').should('have.length', 2);
    cy.get('[data-cy="about-read-more"]').eq(0).should('have.attr', 'href', '/dokument/text-3447');
    cy.get('[data-cy="about-read-more"]').eq(1).should('have.attr', 'href', '/dokument/publ-13885');
  });

  it('is where the footer link points', () => {
    cy.visit('/');
    cy.get('[data-cy="app-footer"]').find('a[href="/om-webbplatsen"]').should('exist');
  });
});
