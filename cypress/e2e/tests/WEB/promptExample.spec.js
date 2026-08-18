// Experimental: cy.prompt() requires being signed in to Cypress Cloud from
// within the Cypress app (top-right avatar icon). See
// https://docs.cypress.io/cloud/features/cypress-ai-features
//
// This is a throwaway example to try the feature live - not part of the
// regular suite. Delete or keep depending on how it goes.
describe("cy.prompt() experiment", () => {
  it("logs in using natural language steps", () => {
    cy.visit("/login");

    cy.prompt(
      [
        "type test@example.com in the email field",
        "type {{password}} in the password field",
        "click the login button",
        "verify an error message about invalid email or password is shown",
      ],
      {
        placeholders: { password: "Senha1234" },
      }
    );
  });
});
