describe("A11y - Login page", () => {
  it("Check that the login page is accessible", () => {
    cy.visit("/login");
    cy.injectAxe();
    cy.checkA11y();
  });

  it("Check that the login page is accessible with Violations Log", () => {
    cy.checkPageA11y("/login");
  });
});
