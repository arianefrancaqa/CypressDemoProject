/// <reference types="cypress" />

import "@testing-library/cypress/add-commands";
import { configure } from "@testing-library/cypress";

const faker = require("faker");

configure({ defaultHidden: true });

const API_URL = Cypress.env("API_BASE_URL");

Cypress.Commands.add("createAccount", () => {
  let name = faker.name.firstName();
  let email = faker.internet.email();
  let password = faker.datatype.number({
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
    //const id = response.body.id;
  });
});
