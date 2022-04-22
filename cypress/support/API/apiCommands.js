import "@testing-library/cypress/add-commands";
import { configure } from "@testing-library/cypress";

configure({ defaultHidden: true });

Cypress.Commands.add("createAccount", ({ name, email, password }) => {
  const request = cy.request({
    method: "POST",
    url: "https://barrigarest.wcaquino.me/usuarios",
    
    body: {
      nome: name,
      email: email,
      senha: password,
      redirecionar: false,
    },
  });
  return request.then((response) => {
    expect(response.status).to.eq(201);
    const id = response.body.id;
  });
});
