import { navbar, loginPage } from "../../../pages/page";
import { faker } from "@faker-js/faker";

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

const loginEmailChecklist = [
  { category: "Non ASCII characters (not a valid email shape)", value: "ção-são-paulo" },
  { category: "HTML tags", value: "<b>bold</b>" },
  { category: "Basic XSS payload", value: "<script>alert('xss')</script>" },
  { category: "Basic SQL injection payload", value: "' OR '1'='1" },
  { category: "Space at the beginning", value: `   ${faker.internet.email()}` },
  { category: "Space at the end", value: `${faker.internet.email()}   ` },
  { category: "Space in the middle", value: "user name@example.com" },
  { category: "Non-alphabetic characters before letters", value: "123!@#not-an-email" },
  { category: "Empty value", value: "" },
];

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

  it("A SQL injection payload disguised as a syntactically valid email does not bypass authentication", () => {
    cy.fillLoginFormAndSubmit({
      email: "' OR '1'='1@example.com",
      password: "anything",
    });
    cy.get(loginPage.error).should("have.text", INVALID_CREDENTIALS_ERROR);
  });
});
