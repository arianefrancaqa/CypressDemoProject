const {
  accountResponseSchema,
  accountListResponseSchema,
} = require("../../../contract/schemas/accounts.contract");
const { errorResponseSchema } = require("../../../contract/schemas/errorResponse.contract");
const { schemaValidation } = require("../../../contract/validateContractSchema");
const { faker } = require("@faker-js/faker");
const accountNameFixture = require("../../../fixtures/accountNameChecklist.json");

const API_URL = Cypress.env("API_BASE_URL");
const VALID_PASSWORD = "Senha1234";

function freshUser() {
  return cy
    .apiRegisterAndLogin({
      name: faker.person.firstName(),
      email: faker.internet.email(),
      password: VALID_PASSWORD,
    })
    .then((body) => body.token);
}

describe("POST /accounts", () => {
  it("Creates an account for the authenticated user", () => {
    freshUser().then((token) => {
      cy.apiCreateAccount(token, "Carteira").then((response) => {
        expect(response.status).to.eq(201);
        expect(response.body.name).to.eq("Carteira");
        schemaValidation(response.body, accountResponseSchema);
      });
    });
  });

  it("Rejects a duplicate account name for the same user, case-insensitively", () => {
    freshUser().then((token) => {
      cy.apiCreateAccount(token, "Carteira").then((r) => expect(r.status).to.eq(201));
      cy.apiCreateAccount(token, "carteira").then((response) => {
        expect(response.status).to.eq(409);
        schemaValidation(response.body, errorResponseSchema);
      });
    });
  });

  it("Allows two different users to use the same account name", () => {
    cy.wrap(null).then(() =>
      freshUser().then((tokenA) =>
        freshUser().then((tokenB) => {
          cy.apiCreateAccount(tokenA, "Carteira").then((r) => expect(r.status).to.eq(201));
          cy.apiCreateAccount(tokenB, "Carteira").then((r) => expect(r.status).to.eq(201));
        })
      )
    );
  });

  it("Requires authentication", () => {
    cy.request({
      method: "POST",
      url: `${API_URL}accounts`,
      body: { name: "Carteira" },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(401);
    });
  });
});

describe("GET /accounts", () => {
  it("Lists only the authenticated user's own accounts", () => {
    freshUser().then((tokenA) => {
      cy.apiCreateAccount(tokenA, "Conta A1");
      cy.apiCreateAccount(tokenA, "Conta A2");

      freshUser().then((tokenB) => {
        cy.apiCreateAccount(tokenB, "Conta B1");

        cy.apiGetAccounts(tokenA).then((response) => {
          expect(response.status).to.eq(200);
          schemaValidation(response.body, accountListResponseSchema);
          expect(response.body.map((a) => a.name)).to.have.members(["Conta A1", "Conta A2"]);
        });
      });
    });
  });
});

describe("GET/PUT/DELETE /accounts/:id - ownership", () => {
  it("Getting a nonexistent account id returns 404", () => {
    freshUser().then((token) => {
      cy.request({
        method: "GET",
        url: `${API_URL}accounts/00000000-0000-0000-0000-000000000000`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(404);
      });
    });
  });

  it("Updates an account's name", () => {
    freshUser().then((token) => {
      cy.apiCreateAccount(token, "Old Name").then((created) => {
        cy.request({
          method: "PUT",
          url: `${API_URL}accounts/${created.body.id}`,
          headers: { Authorization: `Bearer ${token}` },
          body: { name: "New Name" },
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.name).to.eq("New Name");
        });
      });
    });
  });

  it("Deletes an account that has no transactions", () => {
    freshUser().then((token) => {
      cy.apiCreateAccount(token, "Deletable").then((created) => {
        cy.request({
          method: "DELETE",
          url: `${API_URL}accounts/${created.body.id}`,
          headers: { Authorization: `Bearer ${token}` },
        }).then((response) => {
          expect(response.status).to.eq(204);
        });
      });
    });
  });

  it("Refuses to delete an account that still has transactions", () => {
    freshUser().then((token) => {
      cy.apiCreateAccount(token, "Has Transactions").then((created) => {
        cy.apiCreateTransaction(token, created.body.id, {
          description: "Salary",
          amount: 100,
          type: "income",
          date: "2026-01-01",
        }).then((tx) => expect(tx.status).to.eq(201));

        cy.request({
          method: "DELETE",
          url: `${API_URL}accounts/${created.body.id}`,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.eq(409);
          expect(response.body).to.deep.eq({
            error: "Cannot delete an account that has transactions",
          });
        });
      });
    });
  });
});

// Most of the checklist data lives in cypress/fixtures/accountNameChecklist.json
// - the length-boundary case below is computed (not hand-typed) since it's
// parametric ("one char past the limit").
const accountNameChecklist = accountNameFixture.concat([
  {
    category: "More than the maximum length (70 chars)",
    value: "A".repeat(70),
    error: "name length must be less than or equal to 60 characters long",
  },
]);

describe("POST /accounts - Name Field Boundary & Security Checklist", () => {
  accountNameChecklist.forEach(({ category, value, error }) => {
    it(`${category} is rejected`, () => {
      freshUser().then((token) => {
        cy.apiCreateAccount(token, value).then((response) => {
          expect(response.status).to.eq(400);
          expect(response.body.details[0].message).to.eq(error);
        });
      });
    });
  });

  it("Digits are allowed in account names (unlike person names)", () => {
    freshUser().then((token) => {
      cy.apiCreateAccount(token, "Bank 2026").then((response) => {
        expect(response.status).to.eq(201);
      });
    });
  });
});
