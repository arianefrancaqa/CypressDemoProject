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
    // const emailt = response.body.email;
    // const passwordt = password;
    // const namet = name;
    //const id = response.body.id;
  });
});

Cypress.Commands.add("createAccountPassingValues", (nameT, emailT, passwordT) => {
  const request = cy.request({
    method: "POST",
    url: `${API_URL}usuarios`,

    body: {
      nome: nameT,
      email: emailT,
      senha: passwordT,
      redirecionar: false,
    },
  });
  return request.then((response) => {
    expect(response.status).to.eq(201);
    expect(response.body.email).to.eq(emailT);
    expect(response.body.nome).to.eq(nameT);
    // const emailt = response.body.email;
    // const passwordt = password;
    // const namet = name;
    //const id = response.body.id;
  });
});
