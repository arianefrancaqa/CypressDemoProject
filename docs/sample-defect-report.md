# Defect Report

Two findings from this codebase. Both were reproduced against the running
stack; the evidence below is captured output, not inferred behaviour.

| ID | Title | Severity | Priority | Status |
|---|---|---|---|---|
| [DEF-001](#def-001) | Concurrent duplicate submissions return HTTP 500 instead of 409 | Major | High | Open |
| [DEF-002](#def-002) | "Cannot delete an account with transactions" is not enforced at the database layer | Medium | Medium | Open — accepted risk pending review |

---

<a name="def-001"></a>

## DEF-001 — Concurrent duplicate submissions return HTTP 500 instead of 409

| Field | Value |
|---|---|
| **Component** | API — `auth.controller.js`, `accounts.controller.js` |
| **Endpoints** | `POST /api/auth/register`, `POST /api/accounts` |
| **Severity** | **Major** — user-facing server error on a normal path, violates the published error contract |
| **Priority** | **High** — user-reachable without special tooling, and the fix is small and low-risk |
| **Environment** | Docker Compose stack (Postgres 16, Node/Express API), commit `03b55ad` |
| **Reproducibility** | **10/10** with simultaneous requests; **6/6** at gaps up to 50 ms on `/auth/register` |
| **Found by** | Exploratory concurrency probe — an area the existing suite did not cover |

### Summary

When two requests that would create the same unique resource arrive inside a
short window, the second returns **`500 Internal Server Error`** with
`{"error":"Internal server error"}` instead of the documented **`409 Conflict`**
with a meaningful message.

The data itself stays correct — the database's unique constraint does its job
and the duplicate row is never written. What fails is **error handling**: a
foreseeable, well-defined conflict is reported as an unexpected server fault.

### Steps to reproduce

**Preconditions:** stack running (`npm run stack:up`), API healthy on `:4000`.

1. Choose an email address not yet registered.
2. Issue two `POST /api/auth/register` requests with that **same** email,
   concurrently (or up to ~50 ms apart).
3. Observe the two responses.

```js
// Reproduction script (Node 18+, no dependencies)
const API = "http://localhost:4000/api";
const body = { name: "Race User", email: `race-${Date.now()}@example.com`, password: "Senha1234" };
const post = () =>
  fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (r) => `${r.status} ${JSON.stringify(await r.json())}`);

Promise.all([post(), post()]).then((r) => console.log(r.join("\n")));
```

### Expected result

One request succeeds with `201`. The other returns the documented conflict
response:

```json
409  { "error": "Email already registered" }
```

### Actual result

```
attempt 1: 500 "Internal server error"  |  201 "ok"
attempt 2: 201 "ok"                     |  500 "Internal server error"
attempt 3: 201 "ok"                     |  500 "Internal server error"
attempt 4: 201 "ok"                     |  500 "Internal server error"
attempt 5: 201 "ok"                     |  500 "Internal server error"
```

The same defect affects `POST /api/accounts` (duplicate account name for one
user), which should return `409 { "error": "An account with this name already
exists" }`:

```
attempt 1: 201 "ok"                     |  500 "Internal server error"
attempt 2: 201 "ok"                     |  500 "Internal server error"
attempt 3: 201 "ok"                     |  500 "Internal server error"
attempt 4: 500 "Internal server error"  |  201 "ok"
attempt 5: 500 "Internal server error"  |  201 "ok"
```

### Evidence — server log

```
backend-1  | error: insert into "accounts" ("name", "user_id") values ($1, $2)
             returning "id", "user_id", "name", "created_at", "updated_at"
             - duplicate key value violates unique constraint
               "accounts_user_id_lower_name_unique"
backend-1  |     at parseErrorMessage (/app/node_modules/pg-protocol/dist/parser.js:306:11)
backend-1  |   severity: 'ERROR',
backend-1  |   constraint: 'accounts_user_id_lower_name_unique',
```

### Race-window measurement

Two requests separated by a controlled delay, 6 runs per interval:

| Gap between requests | `POST /auth/register` | `POST /accounts` |
|---|---|---|
| 0 ms | 6/6 produced a 500 | 4/6 |
| 5 ms | 6/6 | 1/6 |
| 10 ms | 6/6 | 1/6 |
| 25 ms | 6/6 | 0/6 |
| 50 ms | 6/6 | 0/6 |
| 100 ms | 0/6 | — |

The registration window is **an order of magnitude wider** than the account
window. That is explained by the root cause below: registration performs a
bcrypt hash *between* the uniqueness check and the insert, holding the window
open for the duration of the hash.

### Root-cause hypothesis

A **time-of-check to time-of-use (TOCTOU)** race. Both controllers check for an
existing row, then insert, with no transaction, no lock, and no handler for the
constraint violation that the database raises when the check turns out to be
stale.

`server/src/controllers/auth.controller.js`:

```js
const existing = await usersModel.findByEmail(email);   // (1) check
if (existing) {
  throw ApiError.conflict("Email already registered");
}

const passwordHash = await hashPassword(password);      // (2) ~50-100 ms window
const user = await usersModel.create({ name, email, passwordHash }); // (3) insert
```

If a second request completes step (1) before the first completes step (3),
both see "no existing user" and both proceed to insert. Postgres correctly
rejects the second via the `UNIQUE` constraint on `users.email` — but that
rejection surfaces as a raw `pg` error, **not** an `ApiError`. The error handler
treats anything that is not an `ApiError` as an unexpected fault:

`server/src/middleware/errorHandler.js`:

```js
if (err instanceof ApiError) { /* ... 409 path ... */ }

// Anything else (DB errors, bugs, etc.) is logged server-side but never
// leaked to the client
console.error(err);
return res.status(500).json({ error: "Internal server error" });
```

The `console.error` masking is otherwise good practice — it is what prevents
raw Postgres errors reaching clients. The defect is that a *predictable*
conflict is being routed down the *unexpected-fault* path.

`accounts.controller.js` has the identical shape at
`createAccount` (and again in `updateAccount`, which re-checks for a duplicate
name before updating).

### Impact

- **Users see a wrong, unactionable error.** The frontend renders
  `apiErrorMessage(err)`, so the user gets *"Something went wrong. Please try
  again."* instead of *"Email already registered."* They cannot tell that the
  correct next step is to log in rather than retry.
- **The published error contract is violated.** `errorResponse.contract.js`
  and every negative-path test assume conflicts are 409s. A 500 from this API
  is supposed to mean "unexpected fault" — this makes that signal untrustworthy.
- **Genuine faults get buried.** Real 500s are drowned in noise from a
  condition that is entirely expected, degrading alerting and log triage.
- **No data corruption.** Worth stating plainly: the database constraint holds,
  and no duplicate row is ever created. This is an error-handling defect, not
  an integrity one — which is why the severity is Major and not Critical.

### How a real user reaches this

The 50 ms+ window on registration is reachable without any tooling:

1. **Double-clicking the submit button.** No form in the client disables its
   submit control while a request is in flight — verified across
   `Register.jsx`, `AccountForm.jsx`, and `TransactionForm.jsx`. Two clicks in
   the same burst fire two concurrent `POST`s.
2. **Impatient re-submission** on a slow connection, before the first response
   arrives.
3. **Client or proxy retry** after a timeout.

The window also *widens under load* — it is bounded by the bcrypt hash plus a
database round trip, both of which lengthen exactly when the system is busiest.

### Suggested fix

Let the database be the source of truth and translate its constraint violation
into the conflict that it is. The pre-check stays as the fast, friendly path;
the catch closes the race.

```js
// server/src/controllers/auth.controller.js
const PG_UNIQUE_VIOLATION = "23505";

const existing = await usersModel.findByEmail(email);
if (existing) {
  throw ApiError.conflict("Email already registered");
}

const passwordHash = await hashPassword(password);

let user;
try {
  user = await usersModel.create({ name, email, passwordHash });
} catch (err) {
  if (err.code === PG_UNIQUE_VIOLATION) {
    throw ApiError.conflict("Email already registered");
  }
  throw err;
}
```

Apply the same treatment to `accounts.controller.js` `createAccount` and
`updateAccount`, keyed on the `accounts_user_id_lower_name_unique` constraint.

Preferred over the alternatives because it is the smallest change that actually
closes the window: a transaction alone does not help (the conflicting insert
still raises), and `SELECT ... FOR UPDATE` cannot lock a row that does not exist
yet. Extracting the `23505`-to-409 mapping into a shared helper — or into
`errorHandler` with a constraint-name-to-message map — would keep it DRY as
more unique constraints appear.

**Secondary (client-side, separate ticket):** disable submit buttons while a
request is in flight. This removes the most common trigger and is good practice
regardless, but it is *not* a fix — the server-side race remains reachable by
any concurrent caller.

### Suggested regression test

Belongs in the API suite, following the existing conventions:

```js
it("Two simultaneous registrations with the same email yield one 201 and one 409, never a 500", () => {
  const body = { name: "Race User", email: faker.internet.email(), password: VALID_PASSWORD };

  cy.wrap(
    Promise.all([
      fetch(`${API_URL}auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
      fetch(`${API_URL}auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    ]).then((responses) => responses.map((r) => r.status))
  ).then((statuses) => {
    expect(statuses).to.have.members([201, 409]);
  });
});
```

`cy.request` is not usable here — Cypress serialises its commands, which is
exactly what the test needs to avoid. The concurrency probe in `perf/` covers
the same ground at higher volume; see `docs/LOAD-TESTING.md`.

---

<a name="def-002"></a>

## DEF-002 — "Cannot delete an account with transactions" is not enforced at the database layer

| Field | Value |
|---|---|
| **Component** | Database schema — `20260101000002_create_transactions_table.js` |
| **Severity** | **Medium** — no current exploit path through the API; latent risk of silent financial-record loss |
| **Priority** | **Medium** — worth a deliberate decision, not an emergency |
| **Reproducibility** | 100% (direct SQL) |
| **Found by** | Adding database-layer integrity coverage (`cypress/e2e/tests/DATA/dataIntegrity.spec.js`) |

### Summary

The business rule *"you cannot delete an account that still has transactions"*
exists **only in application code**. At the database layer, the foreign key is
declared `ON DELETE CASCADE` — so a direct `DELETE` on an account does not just
permit what the rule forbids, it **silently destroys every transaction attached
to it**.

The API and the database disagree about the same rule, and the database is the
one with the last word.

### Steps to reproduce

1. Create an account and add a transaction to it (via API).
2. `DELETE /api/accounts/:id` → correctly refused with `409`.
3. Run the equivalent statement directly: `DELETE FROM accounts WHERE id = $1`.
4. Count the transactions that referenced that account.

### Expected result

Given a documented business rule that these records are protected, a direct
delete should be **rejected** by a `RESTRICT` / `NO ACTION` foreign key — or,
if cascading is intended, the API-level rule should be documented as advisory
rather than as an invariant.

### Actual result

```
=== API layer: DELETE account that has transactions ===
{"status":409,"data":{"error":"Cannot delete an account that has transactions"}}

=== DB layer: same delete, issued directly in SQL (rolled back) ===
transactions before: 1
DELETE SUCCEEDED at DB level. transactions after: 0
   <-- cascaded away, business rule NOT enforced in DB
```

Declared foreign keys:

| Table | Column | References | Delete rule |
|---|---|---|---|
| accounts | user_id | users | CASCADE |
| transactions | account_id | accounts | **CASCADE** ← contradicts the business rule |
| transactions | user_id | users | CASCADE |

### Root-cause hypothesis

`server/src/db/migrations/20260101000002_create_transactions_table.js`:

```js
table.uuid("account_id").notNullable()
  .references("id").inTable("accounts")
  .onDelete("CASCADE");
```

`CASCADE` is the right choice for `user_id` — deleting a user should remove
their data, and the test suite's `resetDatabase` task depends on exactly that.
It appears to have been applied to `account_id` by symmetry, without noticing
that this particular relationship carries a business rule the others do not.

### Impact

No current exploit path: every route to account deletion goes through
`deleteAccount`, which checks first. The risk is **latent**, and it is the kind
that materialises later:

- A future bulk-delete or admin endpoint that omits the check inherits silent
  data loss rather than an error.
- Maintenance scripts, migrations, and manual DBA operations have no guard rail.
- The application-level check is itself racy in the same way as DEF-001 — a
  transaction inserted between `hasTransactions()` and `remove()` is cascaded
  away without the rule ever being consulted.

The general principle: **a business rule enforced in one layer is a convention;
a business rule enforced in the data model is an invariant.** For financial
records, this one is worth being an invariant.

### Suggested fix

Change the `account_id` foreign key to `RESTRICT`, keeping the application's
409 as the friendly path:

```js
table.uuid("account_id").notNullable()
  .references("id").inTable("accounts")
  .onDelete("RESTRICT");
```

**This needs verification before merging, not just a migration.** Deleting a
*user* currently relies on a cascade chain (`users` → `accounts` → and
separately `users` → `transactions`). Making `transactions.account_id`
`RESTRICT` may cause user deletion to fail depending on the order Postgres
resolves the cascades within a statement — which would break the
`resetDatabase` task the whole suite depends on. `NO ACTION` (deferred to
end-of-statement) is the likelier correct choice over `RESTRICT` (checked
immediately), but that must be **confirmed by running the migration and the
suite**, not assumed.

Given that trade-off, the honest recommendation is: raise it, decide it
explicitly, and record the decision. If the team accepts cascade behaviour,
then `docs/TEST-STRATEGY.md` and `CLAUDE.md` should describe the rule as
application-level rather than as an invariant — the documentation should match
the schema either way.

### Current coverage

`cypress/e2e/tests/DATA/dataIntegrity.spec.js` contains a **characterisation
test** that pins this behaviour and points back at this report. It asserts what
the database does *today* — including the cascade — so that if someone changes
the delete rule, the test fails loudly and this decision gets revisited on
purpose rather than by accident.
