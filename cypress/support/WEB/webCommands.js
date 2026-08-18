import { loginPage, registerPage, dashboardPage, accountDetailPage } from "../../pages/page";

// cy.type() throws on an empty string - .clear() alone already leaves the
// field empty, so only call .type() when there's actually something to type.
// This matters for the boundary checklists' "empty value" cases.
function clearAndType(getChainable, value) {
  const cleared = getChainable.clear();
  return value ? cleared.type(value) : cleared;
}

Cypress.Commands.add("fillLoginFormAndSubmit", ({ email, password }) => {
  clearAndType(cy.get(loginPage.emailInput), email);
  clearAndType(cy.get(loginPage.passwordInput), password);
  cy.get(loginPage.submitButton).click();
});

Cypress.Commands.add("fillRegisterFormAndSubmit", ({ name, email, password }) => {
  clearAndType(cy.get(registerPage.nameInput), name);
  clearAndType(cy.get(registerPage.emailInput), email);
  clearAndType(cy.get(registerPage.passwordInput), password);
  cy.get(registerPage.submitButton).click();
});

Cypress.Commands.add("uiCreateAccount", (name) => {
  clearAndType(cy.get(dashboardPage.accountNameInput), name);
  cy.get(dashboardPage.accountFormSubmit).click();
});

Cypress.Commands.add("uiAddTransaction", ({ description, amount, type, date }) => {
  clearAndType(cy.get(accountDetailPage.descriptionInput), description);
  clearAndType(cy.get(accountDetailPage.amountInput), amount === undefined ? "" : String(amount));
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
