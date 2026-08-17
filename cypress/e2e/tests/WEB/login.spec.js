import { loginPage } from "../../../pages/page";
import { faker } from "@faker-js/faker";

const name = faker.person.firstName();
const email = faker.internet.email();
const password = faker.number.int({
  max: 123456789,
});

beforeEach(() => {
  cy.visit("/");
});

describe("Login GUI Tests", () => {
  it("Wrong Email or Password", () => {
    cy.get(loginPage.loginInput).type(email);
    cy.get(loginPage.passwordInput).type(password);
    cy.get(loginPage.loginButton).click();
    cy.get(".toast-message").should(
      "have.text",
      "Erro: Error: Request failed with status code 400"
    );
  });

  it("Login successfully", () => {
    cy.log("Creating an account using API...");
    cy.createAccountPassingValues(name, email, password);
    cy.log("Login in FE with the account created...");
    cy.get(loginPage.loginInput).type(email);
    cy.get(loginPage.passwordInput).type(password);
    cy.get(loginPage.loginButton).click();
    cy.get(".toast").should("be.visible");
    cy.get(".toast").should("have.text", `×Bem vindo, ${name}!`);
  });

  it("Login with wrong password for an existing account", () => {
    const existingEmail = faker.internet.email();
    cy.createAccountPassingValues("QA Test", existingEmail, password);
    cy.get(loginPage.loginInput).type(existingEmail);
    cy.get(loginPage.passwordInput).type("wrongPassword");
    cy.get(loginPage.loginButton).click();
    cy.get(".toast-message").should(
      "have.text",
      "Erro: Error: Request failed with status code 401"
    );
  });

});

function attemptLogin(email, loginPassword) {
  cy.get(loginPage.loginInput).type(email);
  cy.get(loginPage.passwordInput).type(loginPassword);
  cy.get(loginPage.loginButton).click();
}

// Boundary/security value checklist applied to the login form. These target
// accounts that don't exist, so a well-behaved backend should reject all of
// them the same way it rejects any unknown email (400) - confirmed directly
// against the API before writing these assertions. Non-ASCII input is the
// one exception: it hits the same Postgres encoding error as on
// registration and surfaces as a 500 instead.
const INVALID_CREDENTIALS_MESSAGE =
  "Erro: Error: Request failed with status code 400";
const SERVER_ERROR_MESSAGE = "Erro: Error: Request failed with status code 500";

const loginEmailChecklist = [
  { category: "Non ASCII characters", value: `ção-${faker.string.uuid()}@test.com`, expectServerError: true },
  { category: "More than the maximum length (260 chars)", value: `${"a".repeat(260)}@test.com` },
  { category: "HTML tags", value: `<b>${faker.string.uuid()}</b>@test.com` },
  { category: "Basic XSS payload", value: `<script>alert('xss')</script>.${faker.string.uuid()}@test.com` },
  { category: "Basic SQL injection payload (email and password)", value: "' OR '1'='1", password: "' OR '1'='1" },
  { category: "Space at the beginning", value: `   ${faker.string.uuid()}@test.com` },
  { category: "Space at the end", value: `${faker.string.uuid()}@test.com   ` },
  { category: "Space in the middle", value: `${faker.string.uuid()}  space@test.com` },
  { category: "Non-alphabetic characters before letters", value: `123!@#${faker.string.uuid()}@test.com` },
];

describe("Login GUI Tests - Email Field Boundary & Security Checklist", () => {
  loginEmailChecklist.forEach(({ category, value, password: pwd, expectServerError }) => {
    it(`Email field - ${category} is currently rejected as invalid credentials (${expectServerError ? "500" : "400"})`, () => {
      attemptLogin(value, pwd || "123456");
      cy.get(".toast-message").should(
        "have.text",
        expectServerError ? SERVER_ERROR_MESSAGE : INVALID_CREDENTIALS_MESSAGE
      );
    });
  });
});

// These two use accounts we create ourselves via the API, so the outcome
// isn't dependent on values other testers may have already registered on
// this shared demo server.
describe("Login GUI Tests - Credential Boundary Checklist (self-created accounts)", () => {
  it("Empty value password is currently accepted for both registration and login", () => {
    const email = faker.internet.email();
    cy.createAccountPassingValues("QA Test", email, "").then(() => {
      attemptLogin(email, "");
      cy.get(".toast").should("be.visible");
      cy.get(".toast").should("have.text", "×Bem vindo, QA Test!");
    });
  });

  it("Minimum length value (1 character) password is currently accepted for both registration and login", () => {
    const email = faker.internet.email();
    cy.createAccountPassingValues("QA Test", email, "1").then(() => {
      attemptLogin(email, "1");
      cy.get(".toast").should("be.visible");
      cy.get(".toast").should("have.text", "×Bem vindo, QA Test!");
    });
  });
});

// Best-effort checks for the checklist items that aren't field values:
// looking at the cookie jar and the page source after logging in.
describe("Login GUI Tests - Additional Security Checks (best-effort)", () => {
  it("No cookie is set with the plaintext password after login", () => {
    const loginEmail = faker.internet.email();
    const loginPassword = faker.internet.password();
    cy.createAccountPassingValues("QA Test", loginEmail, loginPassword).then(() => {
      attemptLogin(loginEmail, loginPassword);
      cy.get(".toast").should("be.visible");
      cy.getCookies().then((cookies) => {
        const leaked = cookies.some((cookie) => cookie.value.includes(loginPassword));
        expect(leaked, "no cookie should contain the plaintext password").to.be.false;
      });
    });
  });

  it("Password field is masked in the page source, not exposed as plain text", () => {
    cy.get(loginPage.passwordInput)
      .type("123456")
      .should("have.attr", "type", "password");
  });
});
