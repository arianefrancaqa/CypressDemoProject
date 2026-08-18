const {
  registerResponseSchema,
  loginResponseSchema,
  meResponseSchema,
} = require("../../../contract/schemas/auth.contract");
const { errorResponseSchema } = require("../../../contract/schemas/errorResponse.contract");
const { schemaValidation } = require("../../../contract/validateContractSchema");
const { faker } = require("@faker-js/faker");

const API_URL = Cypress.env("API_BASE_URL");
const VALID_PASSWORD = "Senha1234";

describe("POST /auth/register", () => {
  it("Registering a new account returns 201 with the created user", () => {
    cy.apiRegister({
      name: faker.person.firstName(),
      email: faker.internet.email(),
      password: VALID_PASSWORD,
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body).to.not.have.any.keys("password", "passwordHash", "password_hash");
      return schemaValidation(response.body, registerResponseSchema);
    });
  });

  it("Registering with an already-registered email returns 409, not a crash", () => {
    const email = faker.internet.email();
    cy.apiRegister({ name: "QA Test", email, password: VALID_PASSWORD }).then((response) => {
      expect(response.status).to.eq(201);
    });

    // "QA Test Two" not "QA Test 2" - the name validator rejects digits, and
    // a 400 there would mask the 409 this test is actually checking for.
    cy.apiRegister({ name: "QA Test Two", email, password: VALID_PASSWORD }).then((response) => {
      expect(response.status).to.eq(409);
      expect(response.body).to.deep.eq({ error: "Email already registered" });
      return schemaValidation(response.body, errorResponseSchema);
    });
  });

  it("Email uniqueness is case-insensitive", () => {
    const email = faker.internet.email().toLowerCase();
    cy.apiRegister({ name: "QA Test", email, password: VALID_PASSWORD }).then((response) => {
      expect(response.status).to.eq(201);
    });

    cy.apiRegister({ name: "QA Test Two", email: email.toUpperCase(), password: VALID_PASSWORD }).then(
      (response) => {
        expect(response.status).to.eq(409);
      }
    );
  });

  it("Registering with missing required fields returns 400 listing every missing field", () => {
    cy.apiRegister({}).then((response) => {
      expect(response.status).to.eq(400);
      const fields = response.body.details.map((detail) => detail.field);
      expect(fields).to.have.members(["name", "email", "password"]);
      return schemaValidation(response.body, errorResponseSchema);
    });
  });

  it("Attempting to register as admin via an injected role field has no effect", () => {
    cy.request({
      method: "POST",
      url: `${API_URL}auth/register`,
      body: {
        name: faker.person.firstName(),
        email: faker.internet.email(),
        password: VALID_PASSWORD,
        role: "admin",
        administrador: true,
        isAdmin: true,
      },
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body.role).to.eq("user");
    });
  });
});

describe("POST /auth/login", () => {
  it("Logging in with valid credentials returns 200 with a token", () => {
    const name = faker.person.firstName();
    const email = faker.internet.email();

    cy.apiRegister({ name, email, password: VALID_PASSWORD }).then((r) => expect(r.status).to.eq(201));

    cy.apiLogin({ email, password: VALID_PASSWORD }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.user.name).to.eq(name);
      return schemaValidation(response.body, loginResponseSchema);
    });
  });

  it("Logging in with a nonexistent email returns a generic 401", () => {
    cy.apiLogin({ email: faker.internet.email(), password: VALID_PASSWORD }).then((response) => {
      expect(response.status).to.eq(401);
      expect(response.body).to.deep.eq({ error: "Invalid email or password" });
    });
  });

  it("Logging in with the wrong password returns the identical 401 message (non-enumerable)", () => {
    const email = faker.internet.email();
    cy.apiRegister({ name: "QA Test", email, password: VALID_PASSWORD });

    cy.apiLogin({ email, password: "WrongPass1" }).then((wrongPasswordResponse) => {
      cy.apiLogin({ email: faker.internet.email(), password: "WrongPass1" }).then(
        (nonexistentEmailResponse) => {
          expect(wrongPasswordResponse.status).to.eq(401);
          expect(nonexistentEmailResponse.status).to.eq(401);
          expect(wrongPasswordResponse.body).to.deep.eq(nonexistentEmailResponse.body);
        }
      );
    });
  });

  it("A malformed email is rejected by validation before any credential check (400, not 401)", () => {
    cy.apiLogin({ email: "not-an-email", password: VALID_PASSWORD }).then((response) => {
      expect(response.status).to.eq(400);
      return schemaValidation(response.body, errorResponseSchema);
    });
  });

  it("A SQL injection payload does not bypass authentication", () => {
    cy.apiLogin({ email: "' OR '1'='1", password: "' OR '1'='1" }).then((response) => {
      expect(response.status).to.eq(400);
    });
  });

  it("Every login response carries rate-limit headers, and the remaining count decreases per attempt", () => {
    cy.request({
      method: "POST",
      url: `${API_URL}auth/login`,
      body: { email: faker.internet.email(), password: VALID_PASSWORD },
      failOnStatusCode: false,
    }).then((first) => {
      const firstRemaining = Number(first.headers["ratelimit-remaining"]);
      expect(first.headers).to.have.property("ratelimit-limit");
      expect(firstRemaining).to.be.a("number");

      cy.request({
        method: "POST",
        url: `${API_URL}auth/login`,
        body: { email: faker.internet.email(), password: VALID_PASSWORD },
        failOnStatusCode: false,
      }).then((second) => {
        expect(Number(second.headers["ratelimit-remaining"])).to.eq(firstRemaining - 1);
      });
    });
  });
});

describe("GET /auth/me", () => {
  it("Returns the authenticated user's profile", () => {
    const name = faker.person.firstName();
    // The API normalizes emails to lowercase on registration, so the
    // expected value here must match what actually gets stored/returned.
    const email = faker.internet.email().toLowerCase();
    cy.apiRegisterAndLogin({ name, email, password: VALID_PASSWORD }).then(({ token }) => {
      cy.request({
        method: "GET",
        url: `${API_URL}auth/me`,
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.email).to.eq(email);
        return schemaValidation(response.body, meResponseSchema);
      });
    });
  });

  it("Returns 401 without a token", () => {
    cy.request({
      method: "GET",
      url: `${API_URL}auth/me`,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(401);
    });
  });

  it("Returns 401 with a malformed token", () => {
    cy.request({
      method: "GET",
      url: `${API_URL}auth/me`,
      headers: { Authorization: "Bearer not.a.valid.jwt" },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(401);
    });
  });
});
