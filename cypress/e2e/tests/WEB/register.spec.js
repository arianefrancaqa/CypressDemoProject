import { registerPage } from "../../../pages/page";
import { faker } from "@faker-js/faker";
import nameFieldFixture from "../../../fixtures/nameFieldChecklist.json";
import emailFieldFixture from "../../../fixtures/emailFieldChecklist.json";
import passwordFieldFixture from "../../../fixtures/passwordFieldChecklist.json";

beforeEach(() => {
  cy.visit("/register");
});

const VALID_PASSWORD = "Senha1234";
const SUCCESS_MESSAGE = "Account created successfully. Please log in.";

describe("Register GUI Tests", () => {
  it("Registering a new account succeeds", () => {
    cy.fillRegisterFormAndSubmit({
      name: faker.person.firstName(),
      email: faker.internet.email(),
      password: VALID_PASSWORD,
    });
    cy.get(registerPage.success).should("have.text", SUCCESS_MESSAGE);
  });

  it("Registering with an already used email is rejected", () => {
    const email = faker.internet.email();
    cy.apiRegister({ name: "QA Test", email, password: VALID_PASSWORD }).then((response) => {
      expect(response.status).to.eq(201);
    });

    cy.fillRegisterFormAndSubmit({ name: "QA Test Two", email, password: VALID_PASSWORD });
    cy.get(registerPage.error).should("have.text", "Email already registered");
  });

  it("Registering an account whose name has real, accented Portuguese characters succeeds", () => {
    cy.fillRegisterFormAndSubmit({
      name: "Ariane França",
      email: faker.internet.email(),
      password: VALID_PASSWORD,
    });
    cy.get(registerPage.success).should("have.text", SUCCESS_MESSAGE);
  });
});

// Boundary/security value checklist applied to each field of the registration
// form. Unlike the previous target app, this API enforces real, documented
// rules - every outcome below (including the exact message text) was
// confirmed directly against the running API before being written here.
// Most of the checklist data lives in cypress/fixtures/*.json - the two
// length-boundary cases below are computed (not hand-typed) since they're
// parametric ("one char past the limit"), so they're appended in code
// instead of duplicated as literal strings in the fixture.
const nameFieldChecklist = nameFieldFixture.concat([
  {
    category: "More than the maximum length (120 chars)",
    value: "A".repeat(120),
    error: "name length must be less than or equal to 100 characters long",
  },
]);

const emailFieldChecklist = emailFieldFixture.concat([
  {
    category: "More than the maximum length (262 chars)",
    value: `${"a".repeat(250)}@example.com`,
    error: "email length must be less than or equal to 254 characters long",
  },
]);

const passwordFieldChecklist = passwordFieldFixture.concat([
  {
    category: "More than the maximum length (74 chars)",
    value: "a1".repeat(37),
    error: "password length must be less than or equal to 72 characters long",
  },
]);

describe("Register GUI Tests - Name Field Boundary & Security Checklist", () => {
  nameFieldChecklist.forEach(({ category, value, error }) => {
    it(`Name field - ${category} is rejected`, () => {
      cy.fillRegisterFormAndSubmit({ name: value, email: faker.internet.email(), password: VALID_PASSWORD });
      cy.get(registerPage.fieldError("name")).should("contain.text", error);
    });
  });

  it("Name field - a single space between two words is accepted", () => {
    cy.fillRegisterFormAndSubmit({
      name: "Ana Maria",
      email: faker.internet.email(),
      password: VALID_PASSWORD,
    });
    cy.get(registerPage.success).should("have.text", SUCCESS_MESSAGE);
  });
});

describe("Register GUI Tests - Email Field Boundary & Security Checklist", () => {
  emailFieldChecklist.forEach(({ category, value, error }) => {
    it(`Email field - ${category} is rejected`, () => {
      cy.fillRegisterFormAndSubmit({ name: faker.person.firstName(), email: value, password: VALID_PASSWORD });
      cy.get(registerPage.fieldError("email")).should("contain.text", error);
    });
  });
});

describe("Register GUI Tests - Password Field Boundary & Security Checklist", () => {
  passwordFieldChecklist.forEach(({ category, value, error }) => {
    it(`Password field - ${category} is rejected`, () => {
      cy.fillRegisterFormAndSubmit({ name: faker.person.firstName(), email: faker.internet.email(), password: value });
      cy.get(registerPage.fieldError("password")).should("contain.text", error);
    });
  });

  it("Password field - HTML/XSS/SQL-injection-shaped content is accepted (it's hashed, never rendered)", () => {
    cy.fillRegisterFormAndSubmit({
      name: faker.person.firstName(),
      email: faker.internet.email(),
      password: "<script>1234</script>",
    });
    cy.get(registerPage.success).should("have.text", SUCCESS_MESSAGE);
  });
});
