const { userListResponseSchema } = require("../../../contract/schemas/users.contract");
const { schemaValidation } = require("../../../contract/validateContractSchema");
const { faker } = require("@faker-js/faker");

const API_URL = Cypress.env("API_BASE_URL");
const VALID_PASSWORD = "Senha1234";

// Seeded once when the stack boots (server/src/db/seeds/01_admin_user.js) -
// there is no self-service way to become admin, by design.
const ADMIN_CREDENTIALS = { email: "admin@budgettracker.test", password: "AdminPass123" };

describe("GET /users", () => {
  it("An admin can list every registered user", () => {
    cy.apiLogin(ADMIN_CREDENTIALS).then((loginResponse) => {
      expect(loginResponse.status).to.eq(200);
      const token = loginResponse.body.token;

      cy.apiRegister({
        name: faker.person.firstName(),
        email: faker.internet.email(),
        password: VALID_PASSWORD,
      }).then((registerResponse) => {
        cy.request({
          method: "GET",
          url: `${API_URL}users`,
          headers: { Authorization: `Bearer ${token}` },
        }).then((response) => {
          expect(response.status).to.eq(200);
          const emails = response.body.map((user) => user.email);
          expect(emails).to.include(registerResponse.body.email);
          return schemaValidation(response.body, userListResponseSchema);
        });
      });
    });
  });

  it("A regular (non-admin) user cannot list users", () => {
    cy.apiRegisterAndLogin({
      name: faker.person.firstName(),
      email: faker.internet.email(),
      password: VALID_PASSWORD,
    }).then(({ token }) => {
      cy.request({
        method: "GET",
        url: `${API_URL}users`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(403);
      });
    });
  });

  it("Requires authentication", () => {
    cy.request({
      method: "GET",
      url: `${API_URL}users`,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(401);
    });
  });

  it("Never exposes password hashes", () => {
    cy.apiLogin(ADMIN_CREDENTIALS).then((loginResponse) => {
      cy.request({
        method: "GET",
        url: `${API_URL}users`,
        headers: { Authorization: `Bearer ${loginResponse.body.token}` },
      }).then((response) => {
        response.body.forEach((user) => {
          expect(user).to.not.have.any.keys("password", "passwordHash", "password_hash");
        });
      });
    });
  });
});
