const API_URL = Cypress.env("API_BASE_URL");

Cypress.Commands.add("apiRegister", ({ name, email, password }) => {
  return cy.request({
    method: "POST",
    url: `${API_URL}auth/register`,
    body: { name, email, password },
    failOnStatusCode: false,
  });
});

Cypress.Commands.add("apiLogin", ({ email, password }) => {
  return cy.request({
    method: "POST",
    url: `${API_URL}auth/login`,
    body: { email, password },
    failOnStatusCode: false,
  });
});

// Registers a fresh user and logs in, asserting both succeed. Returns the
// login response body ({ token, user }) for tests that just need a working
// account and don't care about the registration step itself.
Cypress.Commands.add("apiRegisterAndLogin", ({ name, email, password }) => {
  return cy.apiRegister({ name, email, password }).then((registerResponse) => {
    expect(registerResponse.status).to.eq(201);
    return cy.apiLogin({ email, password }).then((loginResponse) => {
      expect(loginResponse.status).to.eq(200);
      return loginResponse.body;
    });
  });
});

Cypress.Commands.add("apiCreateAccount", (token, name) => {
  return cy.request({
    method: "POST",
    url: `${API_URL}accounts`,
    headers: { Authorization: `Bearer ${token}` },
    body: { name },
    failOnStatusCode: false,
  });
});

Cypress.Commands.add("apiGetAccounts", (token) => {
  return cy.request({
    method: "GET",
    url: `${API_URL}accounts`,
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });
});

Cypress.Commands.add("apiCreateTransaction", (token, accountId, transaction) => {
  return cy.request({
    method: "POST",
    url: `${API_URL}accounts/${accountId}/transactions`,
    headers: { Authorization: `Bearer ${token}` },
    body: transaction,
    failOnStatusCode: false,
  });
});
