const { loginSchema } = require("../../../contract/schemas/login.contract");

const {
  schemaValidation,
} = require("../../../contract/validateContractSchema");

describe("Login API Route Validations", () => {
  it("POST Login", () => {
    cy.createAccount().then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body.id).to.not.be.null;
    });
  });

  it("Login Contract API Validation", () => {
    cy.createAccount().then((response) => {
      schemaValidation(response.body, loginSchema);
    });
  });
});
