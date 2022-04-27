import "@testing-library/cypress/add-commands";
import { configure } from "@testing-library/cypress";

configure({ defaultHidden: true });

import { loginPage, registerPage } from "../../pages/page"

Cypress.Commands.add(
  "fillDataToRegisterAccountAndValidateMessage",
  ({ name, email, password, message }) => {
    cy.get(loginPage.registerTabButton).click();
    cy.get(registerPage.nameInput).type(name);
    cy.get(registerPage.emailInput).type(email);
    cy.get(registerPage.passwordInput).type(password);
    cy.get(registerPage.registerButton).click();
    cy.get(".toast-message").should("have.text", message);
  }
);
