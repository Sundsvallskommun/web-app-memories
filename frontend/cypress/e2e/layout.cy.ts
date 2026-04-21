describe('Layout', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('Set focus to main', () => {
    cy.get('h1').should('contain.text', 'Välkommen');
    cy.contains('a', 'Hoppa till innehåll').then(($link) => {
      cy.wrap($link).focus().click({ force: true }); // trigger key Enter seem not to work
    });
    cy.focused().should(($el) => {
      expect($el.prop('tagName')).to.equal('MAIN');
    });
  });
});
