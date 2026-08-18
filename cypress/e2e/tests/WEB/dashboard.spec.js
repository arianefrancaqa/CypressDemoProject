import { dashboardPage } from "../../../pages/page";
import { faker } from "@faker-js/faker";

const VALID_PASSWORD = "Senha1234";

function loginAsFreshUser() {
  const name = faker.person.firstName();
  const email = faker.internet.email();
  cy.apiRegister({ name, email, password: VALID_PASSWORD });
  cy.visit("/login");
  cy.fillLoginFormAndSubmit({ email, password: VALID_PASSWORD });
}

describe("Dashboard GUI Tests", () => {
  beforeEach(() => {
    loginAsFreshUser();
  });

  it("A brand-new user has no accounts yet", () => {
    cy.get(dashboardPage.noAccountsMessage).should("be.visible");
  });

  it("Creating an account shows it in the list", () => {
    const accountName = `Carteira ${faker.string.uuid()}`;
    cy.uiCreateAccount(accountName);
    cy.get(dashboardPage.accountList).should("contain.text", accountName);
  });

  it("Creating a duplicate-named account shows an error", () => {
    const accountName = `Carteira ${faker.string.uuid()}`;
    cy.uiCreateAccount(accountName);
    cy.get(dashboardPage.accountList).should("contain.text", accountName);

    cy.uiCreateAccount(accountName);
    cy.get(dashboardPage.error).should("have.text", "An account with this name already exists");
  });

  it("Creating an account with an invalid name shows the validation error", () => {
    cy.uiCreateAccount("<script>alert(1)</script>");
    cy.get(dashboardPage.error).should("have.text", "Validation failed");
  });
});
