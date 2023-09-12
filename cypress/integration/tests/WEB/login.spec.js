import { loginPage } from "../../../pages/page";
import { faker } from "@faker-js/faker"

let name = faker.name.firstName();
let email = faker.internet.email();
let password = faker.datatype.number({
  max: 123456789,
});

beforeEach(() => {
  cy.visit("/");
});

describe("Login GUI Tests", () => {
  it("Wrong Email or Password", () => {
    cy.get(loginPage.loginInput).type(email);
    cy.get(loginPage.passwordInput).type(password);
    cy.get(loginPage.loginButton).click();
    cy.get(".toast-message").should(
      "have.text",
      "Erro: Error: Request failed with status code 400"
    );
  });

  it("Login successfully", () => {
    cy.log("Creating an account using API...");
    cy.createAccountPassingValues(name, email, password);
    cy.log("Login in FE with the account created...");
    cy.get(loginPage.loginInput).type(email);
    cy.get(loginPage.passwordInput).type(password);
    cy.get(loginPage.loginButton).click();
    cy.get(".toast").should("be.visible");
    cy.get(".toast").should("have.text", `×Bem vindo, ${name}!`);
  });
});
