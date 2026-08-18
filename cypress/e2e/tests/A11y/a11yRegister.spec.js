describe("A11y - Register page", () => {
  it("Check that the register page is accessible", () => {
    cy.visit("/register");
    cy.injectAxe();
    cy.checkA11y();
  });

  it("Check that the register page is accessible with Violations Log", () => {
    cy.checkPageA11y("/register");
  });
});
