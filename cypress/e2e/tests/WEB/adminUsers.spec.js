import { navbar, adminUsersPage } from "../../../pages/page";
import { faker } from "@faker-js/faker";

const VALID_PASSWORD = "Senha1234";
const ADMIN_CREDENTIALS = { email: "admin@budgettracker.test", password: "AdminPass123" };

describe("Admin Users GUI Tests", () => {
  it("An admin sees the Users link and can view every registered user", () => {
    // The API normalizes emails to lowercase on registration, so the
    // expected value here must match what actually gets stored/displayed.
    const registeredEmail = faker.internet.email().toLowerCase();
    cy.apiRegister({ name: faker.person.firstName(), email: registeredEmail, password: VALID_PASSWORD });

    cy.visit("/login");
    cy.fillLoginFormAndSubmit(ADMIN_CREDENTIALS);
    cy.get(navbar.adminLink).click();

    cy.get(adminUsersPage.userList).should("contain.text", registeredEmail);
  });

  it("A regular user does not see the Users link in the navbar", () => {
    const email = faker.internet.email();
    cy.apiRegister({ name: faker.person.firstName(), email, password: VALID_PASSWORD });

    cy.visit("/login");
    cy.fillLoginFormAndSubmit({ email, password: VALID_PASSWORD });

    cy.get(navbar.adminLink).should("not.exist");
  });

  it("A regular user navigating directly to the admin route is redirected away", () => {
    const email = faker.internet.email();
    cy.apiRegister({ name: faker.person.firstName(), email, password: VALID_PASSWORD });

    cy.visit("/login");
    cy.fillLoginFormAndSubmit({ email, password: VALID_PASSWORD });
    // Wait for the post-login redirect first - otherwise a slow token write
    // could make the next visit bounce back to "/" for the wrong reason
    // (no session yet) instead of the admin-authorization check this test
    // is actually meant to exercise.
    cy.location("pathname").should("eq", "/");

    cy.visit("/admin/users");
    cy.location("pathname").should("eq", "/");
  });
});
