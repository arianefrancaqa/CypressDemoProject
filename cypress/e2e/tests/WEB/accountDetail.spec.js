import { accountDetailPage } from "../../../pages/page";
import { faker } from "@faker-js/faker";

const VALID_PASSWORD = "Senha1234";

function loginAndVisitFreshAccount() {
  const name = faker.person.firstName();
  const email = faker.internet.email();
  const accountName = `Account ${faker.string.uuid()}`;

  return cy.apiRegisterAndLogin({ name, email, password: VALID_PASSWORD }).then(({ token }) => {
    return cy.apiCreateAccount(token, accountName).then((created) => {
      cy.visit("/login");
      cy.fillLoginFormAndSubmit({ email, password: VALID_PASSWORD });
      cy.visit(`/accounts/${created.body.id}`);
      cy.get(accountDetailPage.name).should("have.text", accountName);
      return created.body.id;
    });
  });
}

describe("Account Detail GUI Tests", () => {
  it("A brand-new account has a balance of 0 and no transactions", () => {
    loginAndVisitFreshAccount();
    cy.get(accountDetailPage.balance).should("have.text", "Balance: 0");
    cy.get(accountDetailPage.noTransactionsMessage).should("be.visible");
  });

  it("Adding an income transaction updates the balance", () => {
    loginAndVisitFreshAccount();
    cy.uiAddTransaction({
      description: "Salary",
      amount: 1000.5,
      type: "income",
      date: "2026-01-15",
    });
    cy.get(accountDetailPage.transactionList).should("contain.text", "Salary");
    cy.get(accountDetailPage.balance).should("have.text", "Balance: 1000.5");
  });

  it("Adding an expense after an income computes the net balance", () => {
    loginAndVisitFreshAccount();
    cy.uiAddTransaction({ description: "Salary", amount: 1000, type: "income", date: "2026-01-01" });
    cy.get(accountDetailPage.balance).should("have.text", "Balance: 1000");

    cy.uiAddTransaction({ description: "Rent", amount: 300.25, type: "expense", date: "2026-01-02" });
    cy.get(accountDetailPage.balance).should("have.text", "Balance: 699.75");
  });

  it("Adding a transaction with an XSS-shaped description shows the validation error", () => {
    loginAndVisitFreshAccount();
    cy.uiAddTransaction({
      description: "<script>alert(1)</script>",
      amount: 10,
      type: "expense",
      date: "2026-01-01",
    });
    cy.get(accountDetailPage.fieldError("description")).should(
      "contain.text",
      "description must not contain < or > characters"
    );
  });

  it("Deleting a transaction removes it from the list and updates the balance", () => {
    loginAndVisitFreshAccount().then(() => {
      cy.uiAddTransaction({ description: "Temp", amount: 50, type: "expense", date: "2026-01-01" });
      cy.get(accountDetailPage.balance).should("have.text", "Balance: -50");

      cy.get(accountDetailPage.transactionList)
        .find('[data-testid^="delete-transaction-"]')
        .click();

      cy.get(accountDetailPage.noTransactionsMessage).should("be.visible");
      cy.get(accountDetailPage.balance).should("have.text", "Balance: 0");
    });
  });

  it("Deleting an account with no transactions returns to the dashboard", () => {
    loginAndVisitFreshAccount();
    cy.get(accountDetailPage.deleteAccountButton).click();
    cy.location("pathname").should("eq", "/");
  });

  it("Deleting an account that has transactions shows the blocking error", () => {
    loginAndVisitFreshAccount();
    cy.uiAddTransaction({ description: "Blocker", amount: 10, type: "expense", date: "2026-01-01" });
    cy.get(accountDetailPage.deleteAccountButton).click();
    cy.get(accountDetailPage.error).should(
      "have.text",
      "Cannot delete an account that has transactions"
    );
  });
});
