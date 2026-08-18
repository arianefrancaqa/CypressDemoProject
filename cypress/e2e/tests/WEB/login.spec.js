import { navbar, loginPage } from "../../../pages/page";
import { faker } from "@faker-js/faker";
import loginEmailChecklist from "../../../fixtures/loginEmailChecklist.json";

beforeEach(() => {
  cy.visit("/login");
});

describe("Login GUI Tests", () => {
  it("Login with a nonexistent account shows an invalid-credentials error", () => {
    cy.fillLoginFormAndSubmit({ email: faker.internet.email(), password: "Senha1234" });
    cy.get(loginPage.error).should("have.text", "Invalid email or password");
  });

  it("Login successfully", () => {
    const name = faker.person.firstName();
    const email = faker.internet.email();
    const password = "Senha1234";

    cy.apiRegister({ name, email, password }).then((response) => {
      expect(response.status).to.eq(201);
    });

    cy.fillLoginFormAndSubmit({ email, password });
    cy.get(navbar.userName).should("have.text", name);
  });

  it("Login with the wrong password for an existing account shows the same invalid-credentials error", () => {
    const email = faker.internet.email();
    cy.apiRegister({ name: "QA Test", email, password: "Senha1234" });

    cy.fillLoginFormAndSubmit({ email, password: "WrongPass1" });
    cy.get(loginPage.error).should("have.text", "Invalid email or password");
  });
});

// Boundary/security value checklist applied to the login email field. Unlike
// the previous target app, this API validates email format before ever
// touching the database, so most malformed values below are rejected with a
// 400 field error - confirmed directly against the API before writing these
// assertions. A well-formed but nonexistent/mismatched email always falls
// through to the generic, non-enumerable 401 message.
const VALIDATION_ERROR = "Validation failed";
const INVALID_CREDENTIALS_ERROR = "Invalid email or password";

describe("Login GUI Tests - Email Field Boundary & Security Checklist", () => {
  loginEmailChecklist.forEach(({ category, value }) => {
    it(`Email field - ${category} is rejected before checking credentials`, () => {
      cy.fillLoginFormAndSubmit({ email: value, password: "Senha1234" });
      cy.get(loginPage.error).should("have.text", VALIDATION_ERROR);
    });
  });

  it("Email field - a well-formed but nonexistent address falls through to the generic invalid-credentials error", () => {
    cy.fillLoginFormAndSubmit({
      email: `nonexistent-${faker.string.uuid()}@example.com`,
      password: "Senha1234",
    });
    cy.get(loginPage.error).should("have.text", INVALID_CREDENTIALS_ERROR);
  });

  it("A SQL injection payload in the password field does not bypass authentication for a real account", () => {
    // An injection payload can't be disguised as the *email* itself - Joi's
    // email format check rejects the quotes/spaces it needs before the
    // request ever reaches a query, confirmed directly against the API.
    // The password field has no such format restriction, so that's the
    // meaningful place to prove parameterized queries aren't bypassable.
    const email = faker.internet.email().toLowerCase();
    cy.apiRegister({ name: "QA Test", email, password: "Senha1234" });

    cy.fillLoginFormAndSubmit({
      email,
      password: "' OR '1'='1",
    });
    cy.get(loginPage.error).should("have.text", INVALID_CREDENTIALS_ERROR);
  });
});
