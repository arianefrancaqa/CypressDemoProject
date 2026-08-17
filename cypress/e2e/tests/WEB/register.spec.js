import { loginPage, registerPage } from "../../../pages/page";
import { faker } from "@faker-js/faker";

const name = faker.person.firstName();
const email = faker.internet.email();
const password = faker.number.int({
  min: 123456,
  max: 123456789,
});

beforeEach(() => {
  cy.visit("/");
});

describe("Register GUI Tests", () => {
  it("Registering New Account", () => {
    cy.fillDataToRegisterAccountAndValidateMessage({
      name: name,
      email: email,
      password: password,
      message: "Usuário adicionado com sucesso",
    });
  });

  it("Registering with an already used email", () => {
    const duplicateEmail = faker.internet.email();
    cy.createAccountPassingValues("QA Test", duplicateEmail, password);
    cy.fillDataToRegisterAccountAndValidateMessage({
      name: name,
      email: duplicateEmail,
      password: password,
      message: "Erro: Error: Request failed with status code 500",
    });
  });

  // Documents current behavior: neither the front end nor the API validates
  // email format, so registration succeeds even with a malformed address.
  it("Registering with an invalid email format is currently accepted", () => {
    cy.fillDataToRegisterAccountAndValidateMessage({
      name: name,
      email: `not-an-email-${faker.string.uuid()}`,
      password: password,
      message: "Usuário adicionado com sucesso",
    });
  });

  // Documents current behavior: no password strength/length rule is
  // enforced, so a one-character password is accepted.
  it("Registering with a weak password is currently accepted", () => {
    cy.fillDataToRegisterAccountAndValidateMessage({
      name: name,
      email: faker.internet.email(),
      password: "1",
      message: "Usuário adicionado com sucesso",
    });
  });
});

// Boundary/security value checklist applied to each text input of the
// registration form. The API has no validation layer, so most of these
// document "currently accepted" behavior; the two exceptions (non-ASCII
// text and values over 255 chars) hit a Postgres varchar/encoding error
// and surface as a 500, confirmed directly against the API before writing
// these assertions.
const SUCCESS_MESSAGE = "Usuário adicionado com sucesso";
const SERVER_ERROR_MESSAGE = "Erro: Error: Request failed with status code 500";
const OVER_MAX_LENGTH_VALUE = "A".repeat(260);

const nameFieldChecklist = [
  { category: "Non ASCII characters", value: "Àçãü日本語ñ", expectFailure: true },
  { category: "Value made only of spaces", value: "     " },
  { category: "Space at the beginning", value: "   Leading Space" },
  { category: "Space at the end", value: "Trailing Space   " },
  { category: "Space in the middle", value: "Multiple    Spaces  Inside" },
  { category: "HTML tags", value: "<b>Bold</b><i>Italic</i>" },
  { category: "Basic XSS payload", value: "<script>alert('xss')</script>" },
  { category: "Basic SQL injection payload", value: "' OR '1'='1" },
  { category: "Minimum length value (1 character)", value: "A" },
  { category: "Non-alphabetic characters before letters", value: "123!@#Abc" },
  { category: "More than the maximum length (255 chars)", value: OVER_MAX_LENGTH_VALUE, expectFailure: true },
  { category: "Empty value", value: "" },
];

const emailFieldChecklist = [
  { category: "Non ASCII characters", value: `ção-${faker.string.uuid()}@test.com`, expectFailure: true },
  { category: "More than the maximum length (255 chars)", value: `${OVER_MAX_LENGTH_VALUE}@test.com`, expectFailure: true },
  { category: "HTML tags", value: `<b>${faker.string.uuid()}</b>@test.com` },
  { category: "Basic XSS payload", value: `<script>alert('xss')</script>.${faker.string.uuid()}@test.com` },
  { category: "Basic SQL injection payload", value: `' OR '1'='1'.${faker.string.uuid()}` },
  { category: "Space at the beginning", value: `   ${faker.string.uuid()}@test.com` },
  { category: "Space at the end", value: `${faker.string.uuid()}@test.com   ` },
  { category: "Space in the middle", value: `${faker.string.uuid()}  space@test.com` },
  { category: "Non-alphabetic characters before letters", value: `123!@#${faker.string.uuid()}@test.com` },
];

const passwordFieldChecklist = [
  { category: "Non ASCII characters", value: "senhaçãóéü" },
  { category: "Value made only of spaces", value: "     " },
  { category: "Space at the beginning", value: "   leadingSpace" },
  { category: "Space at the end", value: "trailingSpace   " },
  { category: "Space in the middle", value: "pass   word" },
  { category: "HTML tags", value: "<b>pass</b>" },
  { category: "Basic XSS payload", value: "<script>alert('xss')</script>" },
  { category: "Basic SQL injection payload", value: "' OR '1'='1" },
  { category: "Non-alphabetic characters before letters", value: "123!@#Password" },
  { category: "More than the maximum length (260 chars)", value: OVER_MAX_LENGTH_VALUE },
  { category: "Empty value", value: "" },
  // Minimum length (1 char) is already covered by
  // "Registering with a weak password is currently accepted" above.
];

describe("Register GUI Tests - Name Field Boundary & Security Checklist", () => {
  nameFieldChecklist.forEach(({ category, value, expectFailure }) => {
    it(`Name field - ${category} is currently ${expectFailure ? "rejected (500)" : "accepted"}`, () => {
      cy.fillDataToRegisterAccountAndValidateMessage({
        name: value,
        email: faker.internet.email(),
        password: "123456",
        message: expectFailure ? SERVER_ERROR_MESSAGE : SUCCESS_MESSAGE,
      });
    });
  });
});

describe("Register GUI Tests - Email Field Boundary & Security Checklist", () => {
  emailFieldChecklist.forEach(({ category, value, expectFailure }) => {
    it(`Email field - ${category} is currently ${expectFailure ? "rejected (500)" : "accepted"}`, () => {
      cy.fillDataToRegisterAccountAndValidateMessage({
        name: faker.person.firstName(),
        email: value,
        password: "123456",
        message: expectFailure ? SERVER_ERROR_MESSAGE : SUCCESS_MESSAGE,
      });
    });
  });
});

describe("Register GUI Tests - Password Field Boundary & Security Checklist", () => {
  passwordFieldChecklist.forEach(({ category, value }) => {
    it(`Password field - ${category} is currently accepted`, () => {
      cy.fillDataToRegisterAccountAndValidateMessage({
        name: faker.person.firstName(),
        email: faker.internet.email(),
        password: value,
        message: SUCCESS_MESSAGE,
      });
    });
  });
});

// Best-effort checks for the checklist items that aren't field values:
// looking at the page source and attempting to escalate to an admin user.
describe("Register GUI Tests - Additional Security Checks (best-effort)", () => {
  it("Password field is masked in the page source, not exposed as plain text", () => {
    cy.get(loginPage.registerTabButton).click();
    cy.get(registerPage.passwordInput)
      .type("123456")
      .should("have.attr", "type", "password");
  });

  // The registration form has no admin/role field to type into, so this
  // targets the API directly, the same way a user could via dev tools.
  it("Injecting an administrator/role field during registration has no effect", () => {
    cy.request({
      method: "POST",
      url: `${Cypress.env("API_BASE_URL")}usuarios`,
      body: {
        nome: "Privilege Escalation Attempt",
        email: faker.internet.email(),
        senha: "123456",
        administrador: true,
        admin: true,
        role: "admin",
        isAdmin: true,
      },
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body).to.not.have.any.keys(
        "administrador",
        "admin",
        "role",
        "isAdmin"
      );
    });
  });
});
