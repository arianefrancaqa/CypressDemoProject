import { loginPage, registerPage, dashboardPage, accountDetailPage } from "../../pages/page";

Cypress.Commands.add("fillLoginFormAndSubmit", ({ email, password }) => {
  cy.get(loginPage.emailInput).clear().type(email);
  cy.get(loginPage.passwordInput).clear().type(password);
  cy.get(loginPage.submitButton).click();
});

Cypress.Commands.add("fillRegisterFormAndSubmit", ({ name, email, password }) => {
  cy.get(registerPage.nameInput).clear().type(name);
  cy.get(registerPage.emailInput).clear().type(email);
  cy.get(registerPage.passwordInput).clear().type(password);
  cy.get(registerPage.submitButton).click();
});

Cypress.Commands.add("uiCreateAccount", (name) => {
  cy.get(dashboardPage.accountNameInput).clear().type(name);
  cy.get(dashboardPage.accountFormSubmit).click();
});

Cypress.Commands.add("uiAddTransaction", ({ description, amount, type, date }) => {
  cy.get(accountDetailPage.descriptionInput).clear().type(description);
  cy.get(accountDetailPage.amountInput).clear().type(String(amount));
  cy.get(accountDetailPage.typeSelect).select(type);
  // Native <input type="date"> doesn't reliably accept ISO text via .type()
  // (it expects locale-formatted keystrokes) - set the value directly and
  // fire the events React needs to pick up the change.
  cy.get(accountDetailPage.dateInput)
    .invoke("val", date)
    .trigger("input")
    .trigger("change");
  cy.get(accountDetailPage.transactionFormSubmit).click();
});
