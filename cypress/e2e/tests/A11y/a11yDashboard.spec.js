import { faker } from "@faker-js/faker";

describe("A11y - Dashboard page (authenticated)", () => {
  it("Check that the dashboard page is accessible once logged in", () => {
    const email = faker.internet.email();
    cy.apiRegister({ name: faker.person.firstName(), email, password: "Senha1234" });

    cy.visit("/login");
    cy.fillLoginFormAndSubmit({ email, password: "Senha1234" });
    // Wait for the post-login redirect so the a11y check actually runs
    // against the dashboard, not a login page that hasn't navigated away yet.
    cy.location("pathname").should("eq", "/");

    cy.injectAxe();
    cy.checkA11y();
  });
});
