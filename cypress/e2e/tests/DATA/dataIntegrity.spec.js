import { faker } from "@faker-js/faker";

const API_URL = Cypress.env("API_BASE_URL");
const VALID_PASSWORD = "Senha1234";

// Postgres SQLSTATE codes.
const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

// Data-layer coverage. Every other spec in this suite asks "does the API
// enforce this rule?"; these ask "does the rule survive a path that isn't the
// API?" - a migration, an admin script, a future bulk endpoint, a DBA at a
// psql prompt.
//
// The distinction matters: an API test proves the happy path enforces a rule.
// Only a constraint proves the rule cannot be violated. Where the two
// disagree, the database wins, and that gap is a finding - see
// docs/sample-defect-report.md.
//
// Writes go through cy.task("dbAttemptWrite"), which runs inside a
// transaction that is ALWAYS rolled back, so these tests can attempt invalid
// and destructive statements without mutating the suite's data.

function freshUserWithAccount() {
  return cy
    .apiRegisterAndLogin({
      name: faker.person.firstName(),
      email: faker.internet.email(),
      password: VALID_PASSWORD,
    })
    .then((body) =>
      cy.apiCreateAccount(body.token, `Account ${faker.string.uuid()}`).then((account) => ({
        token: body.token,
        userId: body.user.id,
        accountId: account.body.id,
      }))
    );
}

function insertTransactionSql() {
  return `INSERT INTO transactions (account_id, user_id, description, amount, type, date)
          VALUES ($1, $2, $3, $4, $5, $6)`;
}

describe("Data layer - CHECK constraints hold independently of the API", () => {
  // The API rejects these at the Joi layer with a 400. These tests prove the
  // same rules are also written into the schema, so they hold for any writer.
  const rejectedTransactions = [
    {
      category: "Amount of zero",
      values: ["Zero amount", 0, "income", "2026-01-01"],
      constraint: "transactions_amount_check",
    },
    {
      category: "Negative amount",
      values: ["Negative amount", -5, "expense", "2026-01-01"],
      constraint: "transactions_amount_check",
    },
    {
      category: "A type that is neither income nor expense",
      values: ["Bad type", 10, "transfer", "2026-01-01"],
      constraint: "transactions_type_check",
    },
  ];

  rejectedTransactions.forEach(({ category, values, constraint }) => {
    it(`${category} is rejected by the database, not only by the API`, () => {
      freshUserWithAccount().then(({ userId, accountId }) => {
        cy.task("dbAttemptWrite", {
          sql: insertTransactionSql(),
          params: [accountId, userId, ...values],
        }).then((result) => {
          expect(result.accepted, "database accepted an invalid row").to.be.false;
          expect(result.error.code).to.eq(CHECK_VIOLATION);
          expect(result.error.constraint).to.eq(constraint);
        });
      });
    });
  });

  it("A role outside user/admin is rejected by the database", () => {
    // Defence in depth behind the API's stripUnknown behaviour: even a writer
    // that bypasses Joi entirely cannot mint a privilege level that the
    // authorize() middleware was never written to reason about.
    cy.task("dbAttemptWrite", {
      sql: `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)`,
      params: ["Escalation Attempt", faker.internet.email().toLowerCase(), "hash", "superadmin"],
    }).then((result) => {
      expect(result.accepted).to.be.false;
      expect(result.error.code).to.eq(CHECK_VIOLATION);
      expect(result.error.constraint).to.eq("users_role_check");
    });
  });

  it("A valid transaction row is accepted, proving the constraints reject only what they should", () => {
    // Without this, every test above would still pass against a table that
    // rejected all writes for an unrelated reason.
    freshUserWithAccount().then(({ userId, accountId }) => {
      cy.task("dbAttemptWrite", {
        sql: insertTransactionSql(),
        params: [accountId, userId, "Valid row", 10.5, "income", "2026-01-01"],
      }).then((result) => {
        expect(result.accepted, JSON.stringify(result.error)).to.be.true;
      });
    });
  });
});

describe("Data layer - uniqueness is enforced by a real index", () => {
  it("A duplicate account name for the same user is rejected case-insensitively at the database level", () => {
    // The API returns 409 for this. That 409 comes from a pre-check in the
    // controller - this proves there is also a unique index behind it, which
    // is what makes the rule hold under concurrency (see DEF-001).
    freshUserWithAccount().then(({ accountId }) => {
      cy.task("dbAttemptWrite", {
        sql: `INSERT INTO accounts (user_id, name) SELECT user_id, upper(name) FROM accounts WHERE id = $1`,
        params: [accountId],
      }).then((result) => {
        expect(result.accepted).to.be.false;
        expect(result.error.code).to.eq(UNIQUE_VIOLATION);
        expect(result.error.constraint).to.eq("accounts_user_id_lower_name_unique");
      });
    });
  });

  it("The same account name for a different user is accepted, so the index is scoped per user", () => {
    freshUserWithAccount().then(({ accountId }) => {
      freshUserWithAccount().then(({ userId: otherUserId }) => {
        cy.task("dbAttemptWrite", {
          sql: `INSERT INTO accounts (user_id, name) SELECT $1, name FROM accounts WHERE id = $2`,
          params: [otherUserId, accountId],
        }).then((result) => {
          expect(result.accepted, JSON.stringify(result.error)).to.be.true;
        });
      });
    });
  });
});

describe("Data layer - referential integrity", () => {
  it("A transaction cannot reference an account that does not exist", () => {
    freshUserWithAccount().then(({ userId }) => {
      cy.task("dbAttemptWrite", {
        sql: insertTransactionSql(),
        params: [
          "00000000-0000-0000-0000-000000000000",
          userId,
          "Orphan",
          10,
          "income",
          "2026-01-01",
        ],
      }).then((result) => {
        expect(result.accepted).to.be.false;
        expect(result.error.code).to.eq(FOREIGN_KEY_VIOLATION);
        expect(result.error.constraint).to.eq("transactions_account_id_foreign");
      });
    });
  });

  it("No stored transaction is attributed to a different owner than its account", () => {
    // transactions carries a denormalised user_id alongside account_id.
    // Nothing in the schema forces the two to agree (see the characterisation
    // test below), so this asserts the invariant actually holds across every
    // row the application has written.
    cy.task("dbQuery", {
      sql: `SELECT t.id FROM transactions t
            JOIN accounts a ON a.id = t.account_id
            WHERE t.user_id <> a.user_id`,
    }).then((rows) => {
      expect(rows, "transactions whose user_id disagrees with their account's owner").to.be.empty;
    });
  });
});

describe("Data layer - business rule: an account with transactions", () => {
  it("A refused delete leaves the account and its transactions fully intact", () => {
    // The API's 409 is already covered in API/accounts.spec.js. What that
    // test cannot see is whether the refusal was clean - a partial delete
    // that removed the transactions but kept the account would still return
    // 409 and still look correct from the outside.
    freshUserWithAccount().then(({ token, accountId }) => {
      cy.apiCreateTransaction(token, accountId, {
        description: "Blocks deletion",
        amount: 100,
        type: "income",
        date: "2026-01-01",
      }).then((created) => expect(created.status).to.eq(201));

      cy.request({
        method: "DELETE",
        url: `${API_URL}accounts/${accountId}`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(409);
      });

      cy.task("dbQuery", {
        sql: `SELECT
                (SELECT count(*)::int FROM accounts WHERE id = $1) AS accounts,
                (SELECT count(*)::int FROM transactions WHERE account_id = $1) AS transactions`,
        params: [accountId],
      }).then(([counts]) => {
        expect(counts.accounts, "account row").to.eq(1);
        expect(counts.transactions, "transaction rows").to.eq(1);
      });
    });
  });
});

// These tests assert what the database does TODAY, including where that
// disagrees with a documented business rule. They are not endorsements - they
// exist so the behaviour cannot change silently. If one fails, the schema
// changed, and docs/sample-defect-report.md needs revisiting on purpose.
describe("Data layer - characterisation of known gaps (see docs/sample-defect-report.md)", () => {
  it("DEF-002: deleting an account directly in SQL cascades its transactions away", () => {
    freshUserWithAccount().then(({ token, accountId }) => {
      cy.apiCreateTransaction(token, accountId, {
        description: "Cascade probe",
        amount: 25,
        type: "expense",
        date: "2026-01-01",
      }).then((created) => expect(created.status).to.eq(201));

      cy.task("dbAttemptWrite", {
        sql: `DELETE FROM accounts WHERE id = $1`,
        params: [accountId],
        probe: {
          sql: `SELECT count(*)::int AS remaining FROM transactions WHERE account_id = $1`,
          params: [accountId],
        },
      }).then((result) => {
        // The API refuses this with a 409. The database permits it, because
        // transactions.account_id is ON DELETE CASCADE - so the business rule
        // is application-level only, and financial records are destroyed
        // silently by any writer that isn't the controller.
        expect(result.accepted, "database refused the delete - schema may have been fixed").to.be
          .true;
        expect(result.probeRows[0].remaining, "transactions surviving the cascade").to.eq(0);
      });
    });
  });

  it("DEF-002: the transactions -> accounts foreign key is still declared ON DELETE CASCADE", () => {
    cy.task("dbQuery", {
      sql: `SELECT rc.delete_rule
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.referential_constraints rc
              ON tc.constraint_name = rc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name = 'transactions'
              AND kcu.column_name = 'account_id'`,
    }).then((rows) => {
      expect(rows).to.have.length(1);
      // Change this to RESTRICT/NO ACTION only together with the migration,
      // and re-run the suite: resetDatabase relies on the cascade chain.
      expect(rows[0].delete_rule).to.eq("CASCADE");
    });
  });

  it("Email uniqueness is case-insensitive in the API but only case-sensitive in the database", () => {
    // The API lowercases every email via Joi before storing it, so two
    // addresses differing only in case can never both be created through it.
    // The column's UNIQUE constraint is a plain case-sensitive one, so the
    // rule is application-level - the same class of gap as DEF-002, but with
    // no path to reach it while every writer goes through the validator.
    cy.apiRegisterAndLogin({
      name: faker.person.firstName(),
      email: faker.internet.email(),
      password: VALID_PASSWORD,
    }).then(({ user }) => {
      cy.task("dbAttemptWrite", {
        sql: `INSERT INTO users (name, email, password_hash) SELECT 'Case Variant', upper(email), 'hash' FROM users WHERE id = $1`,
        params: [user.id],
      }).then((result) => {
        expect(result.accepted, "an uppercase duplicate email was rejected - schema may have been fixed")
          .to.be.true;
      });
    });
  });

  it("A transaction can be attributed to a user who does not own its account", () => {
    // Nothing in the schema ties transactions.user_id to its account's owner;
    // only the controller does, by always copying account.user_id. A composite
    // foreign key on (account_id, user_id) would make it an invariant.
    // The assertion above ("No stored transaction is attributed to a different
    // owner") is what currently guards this, at the data-quality level.
    freshUserWithAccount().then(({ accountId }) => {
      freshUserWithAccount().then(({ userId: strangerId }) => {
        cy.task("dbAttemptWrite", {
          sql: insertTransactionSql(),
          params: [accountId, strangerId, "Misattributed", 10, "income", "2026-01-01"],
        }).then((result) => {
          expect(result.accepted, "the schema now prevents misattribution - update this test").to.be
            .true;
        });
      });
    });
  });
});
