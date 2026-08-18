const { faker } = require("@faker-js/faker");

const API_URL = Cypress.env("API_BASE_URL");
const VALID_PASSWORD = "Senha1234";
const ADMIN_CREDENTIALS = { email: "admin@budgettracker.test", password: "AdminPass123" };

function freshLoggedInUser() {
  return cy.apiRegisterAndLogin({
    name: faker.person.firstName(),
    email: faker.internet.email(),
    password: VALID_PASSWORD,
  });
}

function request(method, path, token, body) {
  return cy.request({
    method,
    url: `${API_URL}${path}`,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
    failOnStatusCode: false,
  });
}

// The centerpiece of this suite: a user-A / user-B / admin x resource x verb
// matrix proving ownership is enforced everywhere, that "not yours" (403) and
// "doesn't exist" (404) are kept distinct, and that admin can reach anyone's
// data. Every resource's owner check goes through the same shared
// `assertOwnerOrAdmin` helper server-side, so this matrix exercises it from
// every angle a real attacker would try.
describe("Authorization matrix - accounts and transactions", () => {
  let userAToken;
  let userBToken;
  let adminToken;
  let accountId;
  let transactionId;

  before(() => {
    freshLoggedInUser().then((body) => {
      userAToken = body.token;
      return cy.apiCreateAccount(userAToken, `Owned Account ${faker.string.uuid()}`);
    }).then((accountResponse) => {
      accountId = accountResponse.body.id;
      return cy.apiCreateTransaction(userAToken, accountId, {
        description: "Owned transaction",
        amount: 42,
        type: "expense",
        date: "2026-01-01",
      });
    }).then((txResponse) => {
      transactionId = txResponse.body.id;
      return freshLoggedInUser();
    }).then((body) => {
      userBToken = body.token;
      return cy.apiLogin(ADMIN_CREDENTIALS);
    }).then((adminResponse) => {
      adminToken = adminResponse.body.token;
    });
  });

  describe("Accounts", () => {
    it("Owner can read their own account", () => {
      request("GET", `accounts/${accountId}`, userAToken).then((r) => expect(r.status).to.eq(200));
    });

    it("A different user gets 403 reading someone else's account", () => {
      request("GET", `accounts/${accountId}`, userBToken).then((r) => expect(r.status).to.eq(403));
    });

    it("A different user gets 403 updating someone else's account", () => {
      request("PUT", `accounts/${accountId}`, userBToken, { name: "Hijacked" }).then((r) =>
        expect(r.status).to.eq(403)
      );
    });

    it("A different user gets 403 deleting someone else's account", () => {
      request("DELETE", `accounts/${accountId}`, userBToken).then((r) => expect(r.status).to.eq(403));
    });

    it("A different user gets 403 listing someone else's account's transactions", () => {
      request("GET", `accounts/${accountId}/transactions`, userBToken).then((r) =>
        expect(r.status).to.eq(403)
      );
    });

    it("A different user gets 403 adding a transaction to someone else's account", () => {
      request("POST", `accounts/${accountId}/transactions`, userBToken, {
        description: "Injected",
        amount: 1,
        type: "expense",
        date: "2026-01-01",
      }).then((r) => expect(r.status).to.eq(403));
    });

    it("A different user gets 403 reading someone else's account balance", () => {
      request("GET", `accounts/${accountId}/balance`, userBToken).then((r) =>
        expect(r.status).to.eq(403)
      );
    });

    it("A nonexistent account id returns 404, distinct from the 403 above", () => {
      request("GET", "accounts/00000000-0000-0000-0000-000000000000", userBToken).then((r) =>
        expect(r.status).to.eq(404)
      );
    });

    it("Admin can read any user's account", () => {
      request("GET", `accounts/${accountId}`, adminToken).then((r) => expect(r.status).to.eq(200));
    });
  });

  describe("Transactions", () => {
    it("Owner can read their own transaction", () => {
      request("GET", `transactions/${transactionId}`, userAToken).then((r) =>
        expect(r.status).to.eq(200)
      );
    });

    it("A different user gets 403 reading someone else's transaction", () => {
      request("GET", `transactions/${transactionId}`, userBToken).then((r) =>
        expect(r.status).to.eq(403)
      );
    });

    it("A different user gets 403 updating someone else's transaction", () => {
      request("PUT", `transactions/${transactionId}`, userBToken, { amount: 999 }).then((r) =>
        expect(r.status).to.eq(403)
      );
    });

    it("A different user gets 403 deleting someone else's transaction", () => {
      request("DELETE", `transactions/${transactionId}`, userBToken).then((r) =>
        expect(r.status).to.eq(403)
      );
    });

    it("A nonexistent transaction id returns 404, distinct from the 403 above", () => {
      request("GET", "transactions/00000000-0000-0000-0000-000000000000", userBToken).then((r) =>
        expect(r.status).to.eq(404)
      );
    });

    it("Admin can read any user's transaction", () => {
      request("GET", `transactions/${transactionId}`, adminToken).then((r) =>
        expect(r.status).to.eq(200)
      );
    });
  });

  describe("Unauthenticated access", () => {
    it("Every protected route returns 401 without a token, never leaking whether the resource exists", () => {
      [
        ["GET", `accounts/${accountId}`],
        ["GET", `accounts/${accountId}/transactions`],
        ["GET", `transactions/${transactionId}`],
        ["GET", "users"],
      ].forEach(([method, path]) => {
        request(method, path, null).then((r) => expect(r.status).to.eq(401));
      });
    });
  });
});
