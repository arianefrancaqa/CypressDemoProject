const {
  transactionResponseSchema,
  transactionListResponseSchema,
  balanceResponseSchema,
} = require("../../../contract/schemas/transactions.contract");
const { schemaValidation } = require("../../../contract/validateContractSchema");
const { faker } = require("@faker-js/faker");
const transactionChecklist = require("../../../fixtures/transactionChecklist.json");

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
    cy.fixture("sampleTransaction.json").then((transaction) => {
      freshUserWithAccount().then(({ token, accountId }) => {
        cy.apiCreateTransaction(token, accountId, transaction).then((response) => {
          expect(response.status).to.eq(201);
          expect(response.body.amount).to.eq(transaction.amount);
          return schemaValidation(response.body, transactionResponseSchema);
        });
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
        return schemaValidation(response.body, transactionListResponseSchema);
      });

      cy.request({
        method: "GET",
        url: `${API_URL}accounts/${accountId}/balance`,
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.balance).to.eq(699.25);
        return schemaValidation(response.body, balanceResponseSchema);
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
