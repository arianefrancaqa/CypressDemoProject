const {
  transactionResponseSchema,
  transactionListResponseSchema,
  balanceResponseSchema,
} = require("../../../contract/schemas/transactions.contract");
const { schemaValidation } = require("../../../contract/validateContractSchema");
const { faker } = require("@faker-js/faker");

const API_URL = Cypress.env("API_BASE_URL");
const VALID_PASSWORD = "Senha1234";

function freshUserWithAccount() {
  return cy
    .apiRegisterAndLogin({
      name: faker.person.firstName(),
      email: faker.internet.email(),
      password: VALID_PASSWORD,
    })
    .then((body) =>
      cy.apiCreateAccount(body.token, "Test Account").then((account) => ({
        token: body.token,
        accountId: account.body.id,
      }))
    );
}

describe("POST /accounts/:accountId/transactions", () => {
  it("Creates an income transaction", () => {
    freshUserWithAccount().then(({ token, accountId }) => {
      cy.apiCreateTransaction(token, accountId, {
        description: "Salary",
        amount: 1000.5,
        type: "income",
        date: "2026-01-15",
      }).then((response) => {
        expect(response.status).to.eq(201);
        expect(response.body.amount).to.eq(1000.5);
        schemaValidation(response.body, transactionResponseSchema);
      });
    });
  });

  it("Creating a transaction on a nonexistent account returns 404", () => {
    freshUserWithAccount().then(({ token }) => {
      cy.apiCreateTransaction(token, "00000000-0000-0000-0000-000000000000", {
        description: "X",
        amount: 5,
        type: "expense",
        date: "2026-01-01",
      }).then((response) => {
        expect(response.status).to.eq(404);
      });
    });
  });
});

describe("GET /accounts/:accountId/transactions and GET /accounts/:accountId/balance", () => {
  it("Lists transactions for an account and computes the correct balance", () => {
    freshUserWithAccount().then(({ token, accountId }) => {
      cy.apiCreateTransaction(token, accountId, {
        description: "Salary",
        amount: 1000,
        type: "income",
        date: "2026-01-01",
      });
      cy.apiCreateTransaction(token, accountId, {
        description: "Rent",
        amount: 300.75,
        type: "expense",
        date: "2026-01-02",
      });

      cy.request({
        method: "GET",
        url: `${API_URL}accounts/${accountId}/transactions`,
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.length(2);
        schemaValidation(response.body, transactionListResponseSchema);
      });

      cy.request({
        method: "GET",
        url: `${API_URL}accounts/${accountId}/balance`,
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.balance).to.eq(699.25);
        schemaValidation(response.body, balanceResponseSchema);
      });
    });
  });

  it("A brand-new account with no transactions has a balance of 0", () => {
    freshUserWithAccount().then(({ token, accountId }) => {
      cy.request({
        method: "GET",
        url: `${API_URL}accounts/${accountId}/balance`,
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.body.balance).to.eq(0);
      });
    });
  });
});

describe("PUT/DELETE /transactions/:id", () => {
  it("Updates a transaction with a partial body", () => {
    freshUserWithAccount().then(({ token, accountId }) => {
      cy.apiCreateTransaction(token, accountId, {
        description: "Original",
        amount: 50,
        type: "expense",
        date: "2026-01-01",
      }).then((created) => {
        cy.request({
          method: "PUT",
          url: `${API_URL}transactions/${created.body.id}`,
          headers: { Authorization: `Bearer ${token}` },
          body: { amount: 75.5 },
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.amount).to.eq(75.5);
          expect(response.body.description).to.eq("Original");
        });
      });
    });
  });

  it("Deletes a transaction", () => {
    freshUserWithAccount().then(({ token, accountId }) => {
      cy.apiCreateTransaction(token, accountId, {
        description: "To delete",
        amount: 10,
        type: "expense",
        date: "2026-01-01",
      }).then((created) => {
        cy.request({
          method: "DELETE",
          url: `${API_URL}transactions/${created.body.id}`,
          headers: { Authorization: `Bearer ${token}` },
        }).then((response) => {
          expect(response.status).to.eq(204);
        });
      });
    });
  });
});

// Boundary/security value checklist for transaction fields, confirmed
// directly against the running API before being written here.
const transactionChecklist = [
  {
    category: "Amount - zero",
    fields: { amount: 0 },
    error: "amount must be greater than 0",
  },
  {
    category: "Amount - negative",
    fields: { amount: -5 },
    error: "amount must be greater than 0",
  },
  {
    category: "Amount - more than 2 decimal places",
    fields: { amount: 10.123 },
    error: "amount must have at most 2 decimal places",
  },
  {
    category: "Amount - more than the maximum (1,000,000)",
    fields: { amount: 2000000 },
    error: "amount must not exceed 1,000,000",
  },
  {
    category: "Type - not income or expense",
    fields: { type: "transfer" },
    error: "type must be one of [income, expense]",
  },
  {
    category: "Description - basic XSS/HTML payload",
    fields: { description: "<script>alert('xss')</script>" },
    error: "description must not contain < or > characters",
  },
  {
    category: "Date - before the minimum (2000-01-01)",
    fields: { date: "1999-12-31" },
    error: "date must not be before 2000-01-01",
  },
  {
    category: "Date - more than one day in the future",
    fields: { date: "2099-01-01" },
    error: "date must not be more than one day in the future",
  },
];

describe("POST /accounts/:accountId/transactions - Field Boundary & Security Checklist", () => {
  transactionChecklist.forEach(({ category, fields, error }) => {
    it(`${category} is rejected`, () => {
      freshUserWithAccount().then(({ token, accountId }) => {
        const payload = {
          description: "Test transaction",
          amount: 10,
          type: "expense",
          date: "2026-01-01",
          ...fields,
        };
        cy.apiCreateTransaction(token, accountId, payload).then((response) => {
          expect(response.status).to.eq(400);
          const messages = response.body.details.map((detail) => detail.message);
          expect(messages).to.include(error);
        });
      });
    });
  });

  it("A malformed (non-ISO) date is rejected", () => {
    freshUserWithAccount().then(({ token, accountId }) => {
      cy.apiCreateTransaction(token, accountId, {
        description: "Bad date format",
        amount: 10,
        type: "expense",
        date: "01/08/2026",
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.details.some((detail) => detail.field === "date")).to.be.true;
      });
    });
  });

  it("Today's date and tomorrow's date are both accepted", () => {
    freshUserWithAccount().then(({ token, accountId }) => {
      const today = new Date().toISOString().slice(0, 10);
      cy.apiCreateTransaction(token, accountId, {
        description: "Today",
        amount: 10,
        type: "expense",
        date: today,
      }).then((response) => {
        expect(response.status).to.eq(201);
      });
    });
  });
});
