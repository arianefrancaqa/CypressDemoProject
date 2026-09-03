# Requirements Traceability Matrix

Maps each behaviour the application actually implements to the tests that
cover it. Requirement IDs are derived from the source — validators,
controllers, middleware, and migrations — not from a separate specification
document, because in this project the code *is* the specification.

**How to use it:** when behaviour changes, update the affected row in the same
commit. When coverage is added, add the row. The [gaps section](#coverage-gaps)
is as important as the matrix itself — it is what stops this document from
being a comfort blanket.

**Legend:** ✅ automated · ⚠️ partial · ❌ not covered

| Layer key | Location |
|---|---|
| `API` | `cypress/e2e/tests/API/` |
| `WEB` | `cypress/e2e/tests/WEB/` |
| `DATA` | `cypress/e2e/tests/DATA/dataIntegrity.spec.js` |
| `A11Y` | `cypress/e2e/tests/A11y/` |
| `PERF` | `perf/` |
| `CONTRACT` | `cypress/contract/schemas/` (asserted inside API specs) |

---

## AUTH — Authentication

| ID | Requirement | Source | Covered by | ✓ |
|---|---|---|---|---|
| AUTH-01 | A new user can register and is created with role `user` | `auth.controller.js` | `API/auth.spec.js` › "Registering a new account returns 201 with the created user"<br>`WEB/register.spec.js` › "Registering a new account succeeds" | ✅ |
| AUTH-02 | Email is globally unique, case-insensitively | `auth.controller.js`, `users` unique column, Joi `.lowercase()` | `API/auth.spec.js` › "Registering with an already-registered email returns 409, not a crash" · "Email uniqueness is case-insensitive"<br>`WEB/register.spec.js` › "Registering with an already used email is rejected" | ✅ |
| AUTH-03 | No response ever exposes a password or hash | `auth.controller.js`, `users.controller.js` | `API/auth.spec.js` › "Registering a new account returns 201…"<br>`API/users.spec.js` › "Never exposes password hashes" | ✅ |
| AUTH-04 | Valid credentials return a JWT and the user profile | `auth.controller.js` | `API/auth.spec.js` › "Logging in with valid credentials returns 200 with a token"<br>`WEB/login.spec.js` › "Login successfully" | ✅ |
| AUTH-05 | Login failures are non-enumerable (identical 401 for wrong password and unknown email) | `auth.controller.js` | `API/auth.spec.js` › "Logging in with a nonexistent email returns a generic 401" · "…returns the identical 401 message (non-enumerable)"<br>`WEB/login.spec.js` › "Login with the wrong password…" | ✅ |
| AUTH-06 | `GET /auth/me` returns the profile; 401 without or with a malformed token | `auth.controller.js`, `authenticate.js` | `API/auth.spec.js` › "Returns the authenticated user's profile" · "Returns 401 without a token" · "Returns 401 with a malformed token" | ✅ |
| AUTH-07 | Role cannot be self-assigned at registration | `validate.js` (`stripUnknown`), `users_role_check` | `API/auth.spec.js` › "Attempting to register as admin via an injected role field has no effect"<br>`DATA` › "A role outside user/admin is rejected by the database" | ✅ |
| AUTH-08 | Login is rate limited per IP | `rateLimiter.js` | `API/auth.spec.js` › "Every login response carries rate-limit headers, and the remaining count decreases per attempt" | ⚠️ |

> **AUTH-08 is partial by design.** Headers prove the limiter is engaged and
> counting; the 429 path itself is not exercised. See
> [`TEST-STRATEGY.md`](./TEST-STRATEGY.md) §2 for why exhausting the limit in
> the main suite would poison every later login in the run.

---

## AUTHZ — Authorization and ownership (P0)

| ID | Requirement | Source | Covered by | ✓ |
|---|---|---|---|---|
| AUTHZ-01 | An owner can read their own account and transaction | `ownership.js` | `API/authorization.spec.js` › "Owner can read their own account" · "Owner can read their own transaction" | ✅ |
| AUTHZ-02 | A non-owner gets **403** on another user's account: read, update, delete, list transactions, create transaction, read balance | `ownership.js` | `API/authorization.spec.js` › 6 tests, "A different user gets 403 …" | ✅ |
| AUTHZ-03 | A non-owner gets **403** on another user's transaction: read, update, delete | `ownership.js` | `API/authorization.spec.js` › 3 tests, "A different user gets 403 …" | ✅ |
| AUTHZ-04 | A nonexistent resource returns **404**, kept distinct from 403 | `ownership.js` | `API/authorization.spec.js` › "A nonexistent account id returns 404, distinct from the 403 above" · same for transactions<br>`API/accounts.spec.js` › "Getting a nonexistent account id returns 404"<br>`API/transactions.spec.js` › "Creating a transaction on a nonexistent account returns 404" | ✅ |
| AUTHZ-05 | Protected routes return **401** without a token, never leaking existence | `authenticate.js` | `API/authorization.spec.js` › "Every protected route returns 401 without a token, never leaking whether the resource exists"<br>`API/accounts.spec.js` › "Requires authentication"<br>`API/users.spec.js` › "Requires authentication" | ✅ |
| AUTHZ-06 | An admin may read any user's account and transaction | `ownership.js` | `API/authorization.spec.js` › "Admin can read any user's account" · "Admin can read any user's transaction" | ✅ |
| AUTHZ-07 | `GET /users` is admin-only; a regular user gets 403 | `authorize.js` | `API/users.spec.js` › "An admin can list every registered user" · "A regular (non-admin) user cannot list users" | ✅ |
| AUTHZ-08 | The UI hides the admin link and guards the admin route | `Navbar.jsx`, `ProtectedRoute.jsx` | `WEB/adminUsers.spec.js` › "An admin sees the Users link…" · "A regular user does not see the Users link…" · "A regular user navigating directly to the admin route is redirected away" | ✅ |
| AUTHZ-09 | Account listing is scoped to the authenticated user | `accounts.model.js` | `API/accounts.spec.js` › "Lists only the authenticated user's own accounts" | ✅ |
| AUTHZ-10 | A syntactically invalid id returns **400** before the controller runs | `validate.js` › `validateParams` | — | ❌ |

---

## ACCT — Accounts

| ID | Requirement | Source | Covered by | ✓ |
|---|---|---|---|---|
| ACCT-01 | An authenticated user can create an account | `accounts.controller.js` | `API/accounts.spec.js` › "Creates an account for the authenticated user"<br>`WEB/dashboard.spec.js` › "Creating an account shows it in the list" | ✅ |
| ACCT-02 | Account names are unique per user, case-insensitively → 409 | `accounts.controller.js`, `accounts_user_id_lower_name_unique` | `API/accounts.spec.js` › "Rejects a duplicate account name for the same user, case-insensitively"<br>`WEB/dashboard.spec.js` › "Creating a duplicate-named account shows an error"<br>`DATA` › "A duplicate account name for the same user is rejected case-insensitively at the database level" | ✅ |
| ACCT-03 | Two different users may use the same account name | unique index scoped to `user_id` | `API/accounts.spec.js` › "Allows two different users to use the same account name"<br>`DATA` › "The same account name for a different user is accepted, so the index is scoped per user" | ✅ |
| ACCT-04 | An account can be renamed | `accounts.controller.js` | `API/accounts.spec.js` › "Updates an account's name" | ✅ |
| ACCT-05 | An account with no transactions can be deleted | `accounts.controller.js` | `API/accounts.spec.js` › "Deletes an account that has no transactions"<br>`WEB/accountDetail.spec.js` › "Deleting an account with no transactions returns to the dashboard" | ✅ |
| ACCT-06 | An account **with** transactions cannot be deleted → 409 | `accounts.controller.js` | `API/accounts.spec.js` › "Refuses to delete an account that still has transactions"<br>`WEB/accountDetail.spec.js` › "Deleting an account that has transactions shows the blocking error"<br>`DATA` › "A refused delete leaves the account and its transactions fully intact" | ⚠️ |
| ACCT-07 | Account names must match the documented pattern and length | `accounts.validators.js` | `API/accounts.spec.js` › "…Name Field Boundary & Security Checklist" (`accountNameChecklist.json` + computed max-length case) · "Digits are allowed in account names (unlike person names)" | ✅ |

> **ACCT-06 is marked partial** because the rule is enforced in the application
> only. `DATA` › "DEF-002: deleting an account directly in SQL cascades its
> transactions away" pins the gap. See
> [`sample-defect-report.md`](./sample-defect-report.md) DEF-002.

---

## TXN — Transactions

| ID | Requirement | Source | Covered by | ✓ |
|---|---|---|---|---|
| TXN-01 | A transaction can be added to an owned account | `transactions.controller.js` | `API/transactions.spec.js` › "Creates an income transaction"<br>`WEB/accountDetail.spec.js` › "Adding an income transaction updates the balance" | ✅ |
| TXN-02 | Transactions can be listed per account | `transactions.model.js` | `API/transactions.spec.js` › "Lists transactions for an account and computes the correct balance" | ✅ |
| TXN-03 | Balance = Σ income − Σ expense, to 2dp | `transactions.model.js` › `sumByAccount` | `API/transactions.spec.js` › "Lists transactions… and computes the correct balance"<br>`WEB/accountDetail.spec.js` › "Adding an expense after an income computes the net balance"<br>`PERF` › `transactions-load.yml` exact-balance assertion under concurrency | ✅ |
| TXN-04 | A new account has a balance of 0 | `transactions.model.js` | `API/transactions.spec.js` › "A brand-new account with no transactions has a balance of 0"<br>`WEB/accountDetail.spec.js` › "A brand-new account has a balance of 0 and no transactions" | ✅ |
| TXN-05 | A transaction can be partially updated | `updateTransactionSchema` (`.min(1)`) | `API/transactions.spec.js` › "Updates a transaction with a partial body" | ✅ |
| TXN-06 | A transaction can be deleted | `transactions.controller.js` | `API/transactions.spec.js` › "Deletes a transaction"<br>`WEB/accountDetail.spec.js` › "Deleting a transaction removes it from the list and updates the balance" | ✅ |
| TXN-07 | Amount > 0, ≤ 1,000,000, at most 2 decimals; type ∈ {income, expense}; description excludes `<`/`>` | `transactions.validators.js`, `transactions_amount_check`, `transactions_type_check` | `API/transactions.spec.js` › "…Field Boundary & Security Checklist" (`transactionChecklist.json`)<br>`DATA` › "Amount of zero…" · "Negative amount…" · "A type that is neither income nor expense…" | ✅ |
| TXN-08 | Date is `YYYY-MM-DD`, ≥ 2000-01-01 and ≤ tomorrow (UTC) | `transactions.validators.js` | `API/transactions.spec.js` › checklist date rows · "A malformed (non-ISO) date is rejected" · "Today's date and tomorrow's date are both accepted" | ⚠️ |

> **TXN-08 is partial**: the test named "Today's date and tomorrow's date are
> both accepted" asserts only today. The tomorrow boundary — the actual edge of
> the rule — is not exercised.

---

## VAL — Validation and error contract

| ID | Requirement | Source | Covered by | ✓ |
|---|---|---|---|---|
| VAL-01 | Person names: Unicode letters, single space/hyphen/apostrophe, 2–100 chars, no digits | `auth.validators.js` | `WEB/register.spec.js` › "…Name Field Boundary & Security Checklist" (`nameFieldChecklist.json` + computed max-length) · "a single space between two words is accepted" · "…accented Portuguese characters succeeds" | ✅ |
| VAL-02 | Email format and ≤ 254 chars | `auth.validators.js` | `WEB/register.spec.js` › "…Email Field Boundary & Security Checklist"<br>`WEB/login.spec.js` › "…Email Field Boundary & Security Checklist"<br>`API/auth.spec.js` › "A malformed email is rejected by validation before any credential check (400, not 401)" | ✅ |
| VAL-03 | Password 8–72 chars, ≥1 letter and ≥1 digit | `auth.validators.js` | `WEB/register.spec.js` › "…Password Field Boundary & Security Checklist" · "HTML/XSS/SQL-injection-shaped content is accepted (it's hashed, never rendered)" | ✅ |
| VAL-04 | Every 400 lists **all** failing fields | `validate.js` (`abortEarly: false`) | `API/auth.spec.js` › "Registering with missing required fields returns 400 listing every missing field" | ✅ |
| VAL-05 | Error envelope is `{ error, details? }` on every non-2xx | `errorHandler.js` | `errorResponse.contract.js`, asserted in `API/auth.spec.js` and `API/accounts.spec.js` negative paths | ✅ |
| VAL-06 | Unknown body fields are stripped, not rejected | `validate.js` (`stripUnknown`) | `API/auth.spec.js` › "Attempting to register as admin via an injected role field has no effect" | ✅ |
| VAL-07 | A malformed JSON body returns 400 | `errorHandler.js` | — | ❌ |

---

## SEC — Security

| ID | Requirement | Covered by | ✓ |
|---|---|---|---|
| SEC-01 | HTML/XSS payloads are rejected on every text field | Name, account-name, and description checklists across `WEB/register.spec.js`, `API/accounts.spec.js`, `API/transactions.spec.js`<br>`WEB/accountDetail.spec.js` › "Adding a transaction with an XSS-shaped description shows the validation error" | ✅ |
| SEC-02 | SQL-injection payloads cannot bypass authentication | `API/auth.spec.js` › "A SQL injection payload does not bypass authentication"<br>`WEB/login.spec.js` › "A SQL injection payload in the password field does not bypass authentication for a real account" | ✅ |
| SEC-03 | Credentials are never returned by any endpoint | AUTH-03 | ✅ |
| SEC-04 | Privilege escalation via request payload is ineffective | AUTH-07 | ✅ |
| SEC-05 | Object-level authorization (IDOR) is enforced everywhere | The full AUTHZ block | ✅ |

---

## DATA — Database-layer integrity

| ID | Requirement | Covered by | ✓ |
|---|---|---|---|
| DATA-01 | CHECK constraints reject invalid amounts, types, and roles for **any** writer | `DATA` › 3 checklist tests + "A role outside user/admin…" + "A valid transaction row is accepted…" | ✅ |
| DATA-02 | Per-user account-name uniqueness is backed by a real index | `DATA` › 2 uniqueness tests | ✅ |
| DATA-03 | Transactions cannot reference a nonexistent account | `DATA` › "A transaction cannot reference an account that does not exist" | ✅ |
| DATA-04 | No stored transaction is misattributed to a non-owner | `DATA` › "No stored transaction is attributed to a different owner than its account" | ⚠️ |
| DATA-05 | Known schema/application divergences are pinned so they cannot change silently | `DATA` › "characterisation of known gaps" block (4 tests) | ✅ |

> **DATA-04 is partial**: the invariant is asserted over stored data, but
> nothing in the schema enforces it — `DATA` › "A transaction can be attributed
> to a user who does not own its account" documents that. A composite foreign
> key on `(account_id, user_id)` would make it an invariant.

---

## A11Y — Accessibility

| ID | Requirement | Covered by | ✓ |
|---|---|---|---|
| A11Y-01 | The login page has no automated WCAG violations | `A11y/a11yLogin.spec.js` › 2 tests | ⚠️ |
| A11Y-02 | The register page has no automated WCAG violations | `A11y/a11yRegister.spec.js` › 2 tests | ⚠️ |
| A11Y-03 | The authenticated dashboard has no automated WCAG violations | `A11y/a11yDashboard.spec.js` › 1 test | ⚠️ |

> All three are partial for the same reason: automated axe scanning covers
> roughly 30% of WCAG criteria. Account-detail and admin-users screens are not
> scanned at all.

---

## PERF — Behaviour under concurrency

| ID | Requirement | Covered by | ✓ |
|---|---|---|---|
| PERF-01 | No 5xx under concurrent load; only contract-allowed statuses | `perf/login-load.yml`, `perf/transactions-load.yml` status expectations | ✅ |
| PERF-02 | Balances stay arithmetically correct under concurrency | `perf/transactions-load.yml` › exact-balance assertion (170 checks/run) | ✅ |
| PERF-03 | Latency degradation is bounded, not unbounded | `ensure.thresholds` in both configs | ✅ |
| PERF-04 | Saturation behaviour is characterised | [`LOAD-TESTING.md`](./LOAD-TESTING.md) arrival-rate sweep | ✅ |

---

## CONTRACT — Response shapes

| ID | Schema | Asserted in | ✓ |
|---|---|---|---|
| CON-01 | `registerResponseSchema`, `loginResponseSchema`, `meResponseSchema` | `API/auth.spec.js` | ✅ |
| CON-02 | `accountResponseSchema`, `accountListResponseSchema` | `API/accounts.spec.js` | ✅ |
| CON-03 | `transactionResponseSchema`, `transactionListResponseSchema`, `balanceResponseSchema` | `API/transactions.spec.js` | ✅ |
| CON-04 | `userListResponseSchema` | `API/users.spec.js` | ✅ |
| CON-05 | `errorResponseSchema` (shared negative-path envelope) | `API/auth.spec.js`, `API/accounts.spec.js` | ✅ |

---

<a name="coverage-gaps"></a>

## Coverage gaps

Recorded deliberately. A traceability matrix that shows only green is not being
read honestly.

| ID | Gap | Why it is open | Action |
|---|---|---|---|
| AUTHZ-10 | A non-UUID id returns 400, not 404 — untested | The distinction is documented in `CLAUDE.md` and easy to get wrong when writing IDOR tests, but no test pins it | Add to `API/authorization.spec.js` |
| VAL-07 | Malformed JSON returns 500, not 400 | **Open defect** — see DEF-003 | Fix `errorHandler`, then add the regression test drafted in the defect report |
| AUTH-08 | The 429 path is not exercised | Deliberate: exhausting the shared in-memory limiter would poison every later login in the run | Cover in a dedicated run with a low `LOGIN_RATE_LIMIT_MAX` |
| ACCT-06 / DATA-05 | The delete-blocking rule is application-level only | **Open defect** — see DEF-002; the fix needs verification because `resetDatabase` depends on the cascade chain | Decide explicitly, then align schema and docs |
| TXN-08 | The "tomorrow" date boundary is not asserted despite the test name claiming it | Oversight in an existing test | Extend the existing test |
| — | Concurrent duplicate submission returns 500, not 409 | **Open defect** — see DEF-001 | Fix both controllers, then add the regression test drafted in the defect report |
| A11Y | Account-detail and admin-users screens are unscanned; ~70% of WCAG needs manual audit | Automated tooling limit | Add two scans; schedule a manual assistive-technology audit |
| — | No unit-test coverage of application internals | Out of scope — see [`TEST-STRATEGY.md`](./TEST-STRATEGY.md) §1 | Would belong to the implementing team |
