# CLAUDE.md

Working notes for Claude Code sessions in this repository. This is not a
summary of the README — it is the set of rules and traps that are *not*
obvious from reading a single file, written down so a fresh session does not
have to rediscover them (or, worse, get them subtly wrong and produce a test
that passes for the wrong reason).

If something here contradicts the code, the code wins — and the note should be
fixed in the same commit.

---

## 1. What this repository is

A **test suite and its own purpose-built target application**. Two things live
side by side, and the distinction matters constantly:

| Path | Role | Change it when |
|---|---|---|
| `server/`, `client/` | The **system under test** (Node/Express + Postgres API, React/Vite frontend) | The *app's* behaviour is genuinely wrong |
| `cypress/` | The **test suite** | Coverage is missing, or a test asserts the wrong thing |

The app exists so that every asserted outcome is a real, documented rule you
can read in source, rather than the undefined behaviour of a third-party demo
site. **Consequence: a failing test is a real question, not noise.** Before
"fixing" a test, read the validator or controller and decide which side is
wrong. Changing app behaviour to make a test green is almost always the wrong
call, and needs to be stated explicitly in the commit message.

Ports: frontend `8080` (Cypress `baseUrl`), API `4000`
(`Cypress.env("API_BASE_URL")`), Postgres `5432` (reached from the host by the
Cypress Node process, not by the browser).

---

## 2. Test-authoring conventions

### App Actions, not page objects

State is set up through the **API**; the UI is driven only for the behaviour
actually under test. `cypress/pages/page.js` holds selectors *only* — it has
no methods and no `cy.*` calls, and must stay that way.

```js
// Set up via API, assert via UI.
cy.apiRegisterAndLogin({ name, email, password }).then(({ token }) => {
  cy.apiCreateAccount(token, accountName).then((created) => {
    cy.visit("/login");
    cy.fillLoginFormAndSubmit({ email, password });
    ...
  });
});
```

The one thing you **cannot** shortcut is establishing a *browser* session.
`cy.apiLogin` returns a token to the Node process; the app reads its token
from `localStorage["budget_tracker_token"]`, which only the React client
writes. A UI test that needs to be logged in must go through the login form
(or set that key deliberately).

### Selectors

Flat object per page in `cypress/pages/page.js`, every value a
`[data-testid="..."]` string. Selectors that need an id are **functions**:

```js
accountItem: (id) => `[data-testid="account-item-${id}"]`,
```

New UI element → add the `data-testid` in the React component *and* the entry
in `page.js`. Never inline a raw selector in a spec.

### Naming

`describe` names the endpoint or screen (`"POST /accounts"`,
`"Account Detail GUI Tests"`). `it` is a full sentence stating the rule from
the user's or the attacker's point of view — *"A different user gets 403
reading someone else's account"*, not *"test 403"*. This is what makes
`docs/TRACEABILITY.md` mappable to test names instead of line numbers.

### The data-driven boundary/security checklist

The dominant pattern for validation coverage. Checklist rows live in
`cypress/fixtures/*.json` as `{ category, value, error }` — or
`{ category, fields, error }` for transactions, where `fields` is merged over
a valid payload so each row varies exactly one field.

```js
checklist.forEach(({ category, value, error }) => {
  it(`${category} is rejected`, () => { ... });
});
```

**Parametric length boundaries are computed in the spec, not typed into the
fixture** — a fixture containing a literal 120-character string is unreadable
and silently rots when the limit changes:

```js
const nameFieldChecklist = nameFieldFixture.concat([
  {
    category: "More than the maximum length (120 chars)",
    value: "A".repeat(120),
    error: "name length must be less than or equal to 100 characters long",
  },
]);
```

Every `error` string in a fixture is the **exact** message the API returns, and
was confirmed against the running API. Do not write one from memory — §4
explains why the exact text is easy to get wrong.

---

## 3. The API's contract

### Error shape

Every non-2xx response is `{ error: string }`, plus `details` **only** on 400
validation failures:

```json
{
  "error": "Validation failed",
  "details": [{ "field": "name", "message": "name is not allowed to be empty" }]
}
```

`cypress/contract/schemas/errorResponse.contract.js` encodes this and is shared
by every negative-path test. `errorHandler` never leaks internals: any
non-`ApiError` throw becomes a flat `{ "error": "Internal server error" }` 500
— so **a 500 in a test run is always a defect**, never an expected outcome.

### Contract validation must be returned

`schemaValidation()` is `async`. If you call it without `return`, Cypress never
awaits the promise: a broken contract passes silently, or blows up as an
unhandled rejection inside a later, unrelated test.

```js
// Wrong — failure is swallowed.
schemaValidation(response.body, accountResponseSchema);

// Right — last statement in the .then(), returned.
return schemaValidation(response.body, accountResponseSchema);
```

Put it **last**, after the plain `expect`s: returning it ends the chain, and
assertions written after it read as if they were conditional on it when they
are not. This was corrected across the whole suite in commit `03b55ad`; new
specs must not reintroduce it.

### Status codes — the ownership rule

Enforced everywhere through one helper, `server/src/utils/ownership.js`:

| Situation | Status |
|---|---|
| No token / malformed token | **401** |
| Well-formed UUID, resource exists, belongs to someone else | **403** |
| Well-formed UUID, resource does not exist | **404** |
| Id that is not a UUID at all | **400** |
| Role-gated route (`GET /users`) as a non-admin | **403** |

403 and 404 are kept deliberately distinct so IDOR tests can prove the
difference. **The 400 row is the trap**: `validateParams(idParamSchema)` runs
*before* the controller, so `GET /accounts/does-not-exist` returns 400, and
only `GET /accounts/00000000-0000-0000-0000-000000000000` returns 404. A
"nonexistent id returns 404" test must use a syntactically valid UUID.

Admin bypasses ownership (the `user.role !== "admin"` clause in the check) and
there is **no self-service path to admin** — the single admin is seeded at boot
in `server/src/db/seeds/01_admin_user.js`
(`admin@budgettracker.test` / `AdminPass123`).

### Unknown fields are dropped, not rejected

`validateBody` uses `stripUnknown: true`. Posting
`{ ..., role: "admin", isAdmin: true }` to `/auth/register` returns **201 with
`role: "user"`** — not a 400. The privilege-escalation test asserts exactly
that, and it would be wrong to "fix" it to expect a rejection.

---

## 4. Validation rules that are easy to get wrong

Read `server/src/validators/` before asserting on a message. The recurring
mistakes:

- **`validate.js` strips the double quotes Joi puts around field names.** The
  raw Joi message is `"name" length must be at least 2 characters long`; the
  API returns `name length must be at least 2 characters long`. Assert the
  stripped form.
- **Person names reject digits; account names allow them.**
  `NAME_PATTERN = /^\p{L}+(?:[ '-]\p{L}+)*$/u` versus
  `ACCOUNT_NAME_PATTERN = /^[\p{L}\p{N}]+(?:[ -][\p{L}\p{N}]+)*$/u`. A fixture
  user called `"QA Test 2"` fails with a 400 that **masks the 409 the test was
  actually checking for**. Use `"QA Test Two"`. (Real bug, fixed in `03b55ad`.)
- **Whitespace is rejected, never trimmed.** Both patterns anchor on an
  alphanumeric, so `" Leading"` is a 400 — the API does not silently clean
  input, which is precisely what makes the leading/trailing-space checklist
  rows assertable.
- **Emails are lowercased by Joi (`.lowercase()`).** Anything asserted against
  a faker-generated email must be `.toLowerCase()`d, or the assertion compares
  the value you sent with the value that was stored.
- **Amounts reject more than 2 decimal places instead of rounding** — `10.123`
  is a 400, so the boundary is exact and assertable.
- **The transaction date ceiling is computed per request** (tomorrow, UTC).
  Never hardcode a future date as a valid case; use
  `new Date().toISOString().slice(0, 10)`.
- **Dates come back as plain `"YYYY-MM-DD"` strings.**
  `server/src/config/pgTypes.js` overrides the Postgres DATE parser (OID 1082)
  so node-postgres does not turn it into a timezone-shiftable JS `Date`. The
  contract schema therefore uses `Joi.string()`, not `.isoDate()`.
- **Amounts come back as numbers.** The column is `decimal(12,2)`, which
  node-postgres returns as a *string*; the controller coerces with `Number()`.
  Assert `.to.eq(1000.5)`, not `"1000.50"`.

---

## 5. Timing and state traps

### Wait for the post-login redirect

`cy.fillLoginFormAndSubmit` only clicks. The client's async handler then
persists the token and navigates. Navigating away before that lands races the
token write and bounces you back to `/login` — an intermittent failure that
looks like an authorization bug and is not one.

```js
cy.fillLoginFormAndSubmit({ email, password });
cy.location("pathname").should("eq", "/"); // required before any cy.visit()
cy.visit(`/accounts/${id}`);
```

This bites hardest in tests whose *point* is a redirect (the admin-route test
in `adminUsers.spec.js`): without the wait it can pass because no session
existed yet, rather than because the role check fired.

### `cy.type("")` throws

Hence `clearAndType` in `webCommands.js` — `.clear()` alone already leaves the
field empty. Any new form-filling command must use it, or every "empty value"
checklist row fails on the harness rather than on the app.

### Native date inputs

`<input type="date">` does not reliably accept ISO text from `.type()`. Set the
value and fire the events React listens for:

```js
cy.get(sel).invoke("val", date).trigger("input").trigger("change");
```

### The database is reset per spec file

`cypress/support/e2e.js` runs `cy.task("resetDatabase")` in a global `before()`,
deleting every user except the seeded admin (accounts and transactions cascade
away with them). Therefore:

- **Never assert on absolute row counts** that would include other specs' data.
- **Never set up data in one spec expecting another spec to see it.**
- The admin user is the only thing guaranteed to survive.

Without this, list-based assertions — notably the admin user list — get slow
enough to miss Cypress's default retry timeout as data accumulates.

---

## 6. Rate limiting: verified by headers, never exhausted

`server/src/middleware/rateLimiter.js` defaults to **5 login attempts per 15
minutes**. `docker-compose.yml` raises it to `LOGIN_RATE_LIMIT_MAX: 1000` for
the test stack.

Both halves are deliberate, and the reason is worth internalising: every spec
in the suite authenticates from the **same runner IP**, into a **single
15-minute window**, with **no reset hook** — `express-rate-limit`'s counter
lives in memory inside the API container. A test that deliberately exhausted
the limit would poison every login in every spec that ran after it for the rest
of the window, and the failure would surface far away from its cause.

The behaviour is therefore asserted through the response headers instead
(`ratelimit-limit`, `ratelimit-remaining`, decrementing across two consecutive
requests — reliable because Cypress runs serially). **Do not write a test that
loops until 429.** If the 429 path itself ever needs coverage, it belongs in a
dedicated run against a stack booted with a low `LOGIN_RATE_LIMIT_MAX`, not in
the main suite.

---

## 7. Business rules worth knowing

- **An account with transactions cannot be deleted** → 409, `"Cannot delete an
  account that has transactions"`. Enforced in `accounts.controller.js`, *not*
  by a database constraint — see `docs/sample-defect-report.md`; that gap is a
  known, documented finding, not an oversight in the notes.
- **Account names are unique per user, case-insensitively** — backed by a real
  unique index on `(user_id, lower(name))`. Two different users may each have a
  "Carteira".
- **Emails are globally unique, case-insensitively** (lowercased on the way in,
  `UNIQUE` on the column).
- **Balance** = sum(income) − sum(expense), rounded to 2dp, computed in
  `transactions.model.js`. The UI renders it raw (`Balance: 699.75`), with no
  currency formatting — assert with `have.text`.
- **Login failures are non-enumerable**: a wrong password and a nonexistent
  email return byte-identical 401 bodies. A test compares the two responses to
  each other; keep it that way.

---

## 8. Housekeeping

- `cypress/support/**/*.d.ts` and `cypress/payloads/login.json` are **stale
  leftovers from the previous third-party target app**. They document commands
  that no longer exist (`cy.login`, `cy.createAccount`,
  `fillDataToRegisterAccountAndValidateMessage`). Do not trust them as a
  reference, and do not extend them without rewriting them first.
- `cypress/e2e/tests/WEB/promptExample.spec.js` is an explicitly labelled
  experiment (`cy.prompt()`, requires Cypress Cloud sign-in). It is not part of
  the regular suite's guarantees.
- Docs live in `docs/` — strategy, traceability, defect report, load testing,
  quality summary. If a change alters coverage, update `docs/TRACEABILITY.md`
  in the same commit.
- Custom slash commands live in `.claude/commands/`. Prefer extending one over
  re-explaining a pattern from scratch in a prompt.

---

## 9. Commands

```
npm run stack:up      # build + start Postgres, API, frontend; wait for healthy
npm run stack:down    # stop and wipe the database volume
npm run cy:open       # interactive runner (stack must be up)
npm run cy:run        # headless
npm run test:e2e      # boot stack, run suite headlessly, leave stack running
npm run lint
```

The stack must be running before any Cypress command. There is no mocked mode,
by design.
