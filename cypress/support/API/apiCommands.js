/// <reference types="cypress" />

import "@testing-library/cypress/add-commands";
import { configure } from "@testing-library/cypress";
import { faker } from "@faker-js/faker";

configure({ defaultHidden: true });

const API_URL = Cypress.env("API_BASE_URL");

Cypress.Commands.add("createAccount", () => {
  const name = faker.person.firstName();
  const email = faker.internet.email();
  const password = faker.number.int({
    min: 123456,
    max: 123456789,
  });

  const request = cy.request({
    method: "POST",
    url: `${API_URL}usuarios`,

    body: {
      nome: name,
      email: email,
      senha: password,
      redirecionar: false,
    },
  });

  return request.then((response) => {
    expect(response.status).to.eq(201);
    expect(response.body.email).to.eq(email);
    expect(response.body.nome).to.eq(name);
  });
});

Cypress.Commands.add("createAccountPassingValues", (name, email, password) => {
  const request = cy.request({
    method: "POST",
    url: `${API_URL}usuarios`,

    body: {
      nome: name,
      email: email,
      senha: password,
      redirecionar: false,
    },
  });

  return request.then((response) => {
    expect(response.status).to.eq(201);
    expect(response.body.email).to.eq(email);
    expect(response.body.nome).to.eq(name);
  });
});

Cypress.Commands.add("login", (email, password) => {
  return cy.request({
    method: "POST",
    url: `${API_URL}signin`,
    body: {
      email: email,
      senha: password,
    },
    failOnStatusCode: false,
  });
});

