import { loginPage, registerPage } from "../../../pages/page";
const faker = require("@faker-js/faker");

let name = faker.faker.name.firstName();
let email = faker.faker.internet.email();
let password = faker.faker.datatype.number({
  min: 123456,
  max: 123456789,
});

beforeEach(() => {
  cy.visit("/");
});

describe("Register GUI Tests", () => {
  it("Registering New Account", () => {
    cy.fillDataToRegisterAccountAndValidateMessage({
      name: name,
      email: email,
      password: password,
      message: "Usuário adicionado com sucesso",
    });
  });

  it("Inserting wrong email format", () => {
    cy.fillDataToRegisterAccountAndValidateMessage({
      name: name,
      email: "wrongemailformat....",
      password: password,
      message: "Erro: Error: Request failed with status code 500",
    });
  });
});
