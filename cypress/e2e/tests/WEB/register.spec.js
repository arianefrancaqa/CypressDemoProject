import { registerPage } from "../../../pages/page";
import { faker } from "@faker-js/faker";

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
const nameFieldChecklist = [
  {
    category: "Value made only of spaces",
    value: "     ",
    error:
      "name must contain only letters, single spaces, hyphens or apostrophes, with no leading or trailing whitespace",
  },
  {
    category: "Space at the beginning",
    value: " Leading Space",
    error:
      "name must contain only letters, single spaces, hyphens or apostrophes, with no leading or trailing whitespace",
  },
  {
    category: "Space at the end",
    value: "Trailing Space ",
    error:
      "name must contain only letters, single spaces, hyphens or apostrophes, with no leading or trailing whitespace",
  },
  {
    category: "Space in the middle (doubled)",
    value: "Double  Space",
    error:
      "name must contain only letters, single spaces, hyphens or apostrophes, with no leading or trailing whitespace",
  },
  {
    category: "HTML tags",
    value: "<b>Bold</b>",
    error:
      "name must contain only letters, single spaces, hyphens or apostrophes, with no leading or trailing whitespace",
  },
  {
    category: "Basic XSS payload",
    value: "<script>alert('xss')</script>",
    error:
      "name must contain only letters, single spaces, hyphens or apostrophes, with no leading or trailing whitespace",
  },
  {
    category: "Basic SQL injection payload",
    value: "' OR '1'='1",
    error:
      "name must contain only letters, single spaces, hyphens or apostrophes, with no leading or trailing whitespace",
  },
  {
    category: "Non-alphabetic characters before letters",
    value: "123abc",
    error:
      "name must contain only letters, single spaces, hyphens or apostrophes, with no leading or trailing whitespace",
  },
  {
    category: "Minimum length value (1 character)",
    value: "A",
    error: "name length must be at least 2 characters long",
  },
  {
    category: "More than the maximum length (120 chars)",
    value: "A".repeat(120),
    error: "name length must be less than or equal to 100 characters long",
  },
  { category: "Empty value", value: "", error: "name is not allowed to be empty" },
];

const emailFieldChecklist = [
  {
    category: "More than the maximum length (262 chars)",
    value: `${"a".repeat(250)}@example.com`,
    error: "email length must be less than or equal to 254 characters long",
  },
  { category: "HTML tags", value: "<b>bold</b>@example.com", error: "email must be a valid email" },
  {
    category: "Basic XSS payload",
    value: "<script>alert('xss')</script>@example.com",
    error: "email must be a valid email",
  },
  {
    category: "Space at the beginning",
    value: `  ${faker.internet.email()}`,
    error: "email must be a valid email",
  },
  {
    category: "Space at the end",
    value: `${faker.internet.email()}  `,
    error: "email must be a valid email",
  },
  { category: "Non-alphabetic characters before letters", value: "not-an-email", error: "email must be a valid email" },
  { category: "Empty value", value: "", error: "email is not allowed to be empty" },
];

const passwordFieldChecklist = [
  {
    category: "Below the minimum length (6 chars, one under the 8-char floor)",
    value: "Ab1234",
    error: "password length must be at least 8 characters long",
  },
  {
    category: "More than the maximum length (74 chars)",
    value: `${"a1".repeat(37)}`,
    error: "password length must be less than or equal to 72 characters long",
  },
  {
    category: "No digit",
    value: "onlylettersnodigit",
    error: "password must contain at least one letter and one digit",
  },
  {
    category: "No letter",
    value: "12345678",
    error: "password must contain at least one letter and one digit",
  },
  { category: "Empty value", value: "", error: "password is not allowed to be empty" },
];

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
