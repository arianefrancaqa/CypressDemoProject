const { loginSchema } = require("../../../contract/schemas/login.contract");
const { signinSchema } = require("../../../contract/schemas/signin.contract");

const {
  schemaValidation,
} = require("../../../contract/validateContractSchema");

const { faker } = require("@faker-js/faker");

const API_URL = Cypress.env("API_BASE_URL");

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

describe("POST /usuarios - Negative Validations", () => {
  it("Registering with an already used email returns 500", () => {
    const email = faker.internet.email();

    cy.createAccountPassingValues("QA Test", email, "123456").then(() => {
      cy.request({
        method: "POST",
        url: `${API_URL}usuarios`,
        body: { nome: "QA Test 2", email: email, senha: "123456" },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(500);
      });
    });
  });

  it("Registering with missing required fields returns 500", () => {
    cy.request({
      method: "POST",
      url: `${API_URL}usuarios`,
      body: {},
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(500);
    });
  });

  // Documents current API behavior: no password strength or email format
  // validation is enforced server-side, so both requests below succeed.
  it("Registering with a one-character password is currently accepted", () => {
    cy.request({
      method: "POST",
      url: `${API_URL}usuarios`,
      body: { nome: "QA Test", email: faker.internet.email(), senha: "1" },
    }).then((response) => {
      expect(response.status).to.eq(201);
    });
  });

  it("Registering with an invalid email format is currently accepted", () => {
    cy.request({
      method: "POST",
      url: `${API_URL}usuarios`,
      body: {
        nome: "QA Test",
        email: `not-an-email-${faker.string.uuid()}`,
        senha: "123456",
      },
    }).then((response) => {
      expect(response.status).to.eq(201);
    });
  });
});

describe("POST /signin - Login API Validations", () => {
  it("Login with valid credentials", () => {
    const name = faker.person.firstName();
    const email = faker.internet.email();
    const password = "123456";

    cy.createAccountPassingValues(name, email, password).then(() => {
      cy.login(email, password).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.nome).to.eq(name);
        expect(response.body.token).to.not.be.null;
      });
    });
  });

  it("Login Contract API Validation", () => {
    const email = faker.internet.email();
    const password = "123456";

    cy.createAccountPassingValues("QA Test", email, password).then(() => {
      cy.login(email, password).then((response) => {
        schemaValidation(response.body, signinSchema);
      });
    });
  });

  // Unlike the 400 (nonexistent email) case, the API returns an empty
  // body for a wrong password against an existing email - no error message.
  it("Login with wrong password returns 401 with an empty body", () => {
    const email = faker.internet.email();

    cy.createAccountPassingValues("QA Test", email, "123456").then(() => {
      cy.login(email, "wrongPassword").then((response) => {
        expect(response.status).to.eq(401);
        expect(response.body).to.be.undefined;
      });
    });
  });

  it("Login with nonexistent email returns 400", () => {
    cy.login(faker.internet.email(), "123456").then((response) => {
      expect(response.status).to.eq(400);
      expect(response.body.error).to.eq("Problemas com o login do usuário");
    });
  });
});
