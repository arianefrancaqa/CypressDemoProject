import { loginPage } from "../../../pages/page";
const faker = require('@faker-js/faker')

let name = faker.faker.name.firstName();
let email = faker.faker.internet.email();
let password = faker.faker.datatype.number({
    'min': 123456,
    'max': 123456789
});

describe("Login GUI Tests", () =>{

    it("Wrong Email or Password", () =>{
        cy.visit('/');
        cy.get(loginPage.loginInput).type(email);
        cy.get(loginPage.passwordInput).type(password);
        cy.get(loginPage.loginButton).click();
        cy.get('.toast-message').should('have.text', 'Erro: Error: Request failed with status code 400');
    })

    it("Login successfully", () => {
        cy.createAccount({name: name, email: email, password: password});
        cy.visit('/');
        cy.get(loginPage.loginInput).type(email);
        cy.get(loginPage.passwordInput).type(password);
        cy.get(loginPage.loginButton).click();
        cy.get('.toast').should("be.visible");
        cy.get('.toast').should("have.text", `×Bem vindo, ${name}!`)
    })
})