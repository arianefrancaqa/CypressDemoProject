# CypressDemoProject

## Welcome guys to my Cypress Demo Project! :raising_hand_woman:

### This project includes:
- A custom full-stack app to test against - a small budget tracker (Node/Express + PostgreSQL API, React frontend), built specifically to have real, documented validation and authorization rules instead of relying on a third-party demo site
- API Testing
- Contract API Testing (Joi schemas, including negative/error-response contracts)
- GUI testing
- Accessibility Testing (A11Y)
- A boundary-value & security checklist (spaces, HTML/XSS/SQL-injection payloads, min/max length, empty values, etc.) applied to every text input
- Authorization/IDOR testing (ownership checks, admin vs. regular user, 403 vs 404)
- Database-level data-integrity testing (constraints asserted directly against
  Postgres, not only through the API)
- Load/failure testing with Artillery, asserting graceful degradation rather
  than throughput
- A written QA practice - test strategy, traceability matrix, and defect
  reports (see [`docs/`](docs/))
- Built with Claude Code as a deliberate part of the workflow, with the
  project's conventions taught to the tool over time (see
  [`CLAUDE.md`](CLAUDE.md) and [`docs/claude-workflow.md`](docs/claude-workflow.md))
- Everything runs in Docker, locally and in CI

---

## 1. Architecture

```
CypressDemoProject/
├── server/        Node/Express API (Knex + PostgreSQL, JWT auth, Joi validation)
├── client/        React (Vite) frontend
├── cypress/       The test suite (API, GUI, Contract, Data, A11y)
├── perf/          Artillery load/failure scenarios
├── docs/          Test strategy, traceability, defect reports, load results
├── .claude/       CLAUDE.md conventions + custom slash commands
├── docker-compose.yml
└── .github/workflows/main.yml
```

The app is a small personal budget tracker: users register/log in, create accounts
("Carteira", "Banco X", ...), and add income/expense transactions to them. It has:

- JWT authentication with two roles (`user`, `admin`)
- Ownership-based authorization (you can only see/edit your own accounts and
  transactions; a mismatched id returns `403`, a nonexistent one returns `404`)
- An admin-only endpoint to list all users
- Real field validation (documented in `server/src/validators/`) with a
  consistent error shape: `{ "error": "...", "details"?: [{ "field", "message" }] }`
- A business rule beyond plain CRUD: you can't delete an account that still has
  transactions
- Rate limiting on login, `helmet` security headers, and CORS restricted to the
  frontend's origin

The whole point of building this instead of testing a third-party site is that
every outcome the test suite asserts on is a real, intentional rule you can read
in the source - not undocumented/undefined behavior.

---

## 2. Running it locally

### Prerequisites
- [Node.js](https://nodejs.org/) 20 or newer, with npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)
- [Git](https://git-scm.com/downloads)

### Clone the repository
```
git clone https://github.com/arianefrancaqa/CypressDemoProject.git
cd CypressDemoProject
```

### Install dependencies
```
npm install
```
(This installs Cypress and the test-suite tooling. `server/` and `client/` each
have their own `package.json` for the app itself - Docker installs those inside
their containers, you don't need to `npm install` in those folders unless you
want to run the app outside Docker.)

### Configure environment variables
```
cp .env.example .env
```
The defaults in `.env.example` work out of the box for local use - no values
need to be changed to just run the stack.

### Start the app stack
```
npm run stack:up
```
This builds and starts three containers - PostgreSQL, the API (with migrations
and a seeded admin user run automatically on boot), and the frontend - and waits
for all of them to report healthy. Once it's done:

- Frontend: http://localhost:8080
- API: http://localhost:4000/api (health check at `/api/health`)
- Postgres: `localhost:5432`

A seeded admin account is always available: `admin@budgettracker.test` /
`AdminPass123`.

Stop everything (and wipe the database volume) with:
```
npm run stack:down
```

### Run the tests

With the stack already running (`npm run stack:up`):
```
npm run cy:open     # interactive Test Runner
npm run cy:run       # headless
```

Or, to boot the stack, run the full suite headlessly, and leave the stack
running afterward, in one command:
```
npm run test:e2e
```

---

## 3. About the test suite

- Cypress specs live under `cypress/e2e/tests/`, split into `API/`, `WEB/`,
  `DATA/`, and `A11y/`.
- `cypress/pages/page.js` holds one flat selector object per page, all keyed
  off `data-testid` attributes in the React app.
- `cypress/support/API/apiCommands.js` and `cypress/support/WEB/webCommands.js`
  are small, composable custom commands (register/login via the API, fill a
  form and submit, etc.) that specs build on top of.
- `cypress/contract/` holds Joi schemas used to validate API response shapes,
  including an `errorResponse` schema shared by every negative-path test.
- Several specs use a data-driven pattern: an array of
  `{ category, value, expected outcome }` objects, looped with `.forEach` to
  generate one `it()` per case. This is how the boundary/security checklist
  (spaces, XSS, SQL injection, empty/min/max values, etc.) is applied
  consistently across every text field in the app.
- `authorization.spec.js` is the centerpiece of the security coverage: a
  user-A / user-B / admin × resource × verb matrix proving ownership is
  enforced everywhere.
- To speed up GUI tests, accounts are usually created via API requests
  (`cy.apiRegister`, `cy.apiCreateAccount`, ...) rather than by driving the UI,
  the same "App Actions" pattern the project has always used.
- The login endpoint's rate limit is deliberately raised in
  `docker-compose.yml` for local/CI test runs (every spec authenticates from
  the same runner IP); the real, stricter default lives in the server code and
  the rate-limiting behavior itself is verified via response headers rather
  than by exhausting the limit.
- `cypress/e2e/tests/DATA/dataIntegrity.spec.js` asserts constraints directly
  against Postgres, because an API test proves the happy path enforces a rule
  while only a constraint proves the rule can't be violated. Its writes run
  inside a transaction that is always rolled back. This is what surfaced
  DEF-002.
- `perf/` holds Artillery scenarios that assert graceful degradation - no 5xx,
  contract-allowed statuses only, bounded latency, and an exact-balance check
  so concurrent reads have to be arithmetically correct, not merely
  successful.

---

## 4. Documentation

The written side of the QA practice - the part that usually goes missing from a
test-automation portfolio:

| Document | What it covers |
|---|---|
| [`docs/TEST-STRATEGY.md`](docs/TEST-STRATEGY.md) | Scope, risk-based prioritization (why authorization/IDOR is P0), environments, entry/exit criteria, automated vs. manual and why |
| [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md) | Requirement IDs derived from the app's real behavior, mapped to the specs and test names that cover them - including an explicit gaps table |
| [`docs/sample-defect-report.md`](docs/sample-defect-report.md) | Three defects found in this codebase, each reproduced with captured evidence, root-cause analysis, and a suggested fix |
| [`docs/LOAD-TESTING.md`](docs/LOAD-TESTING.md) | Load/failure approach and measured results, including where the login path saturates and why |
| [`docs/QUALITY-SUMMARY.md`](docs/QUALITY-SUMMARY.md) | One page in business language, for a non-technical stakeholder |

Run the load scenarios with the stack up:

```
npm run perf              # both scenarios
npm run perf:login        # POST /auth/login under concurrency
npm run perf:transactions # the full authenticated transaction journey
```

---

## 5. Built with Claude Code, on purpose

This project is AI-augmented by design, and tries to show that specifically
rather than as a claim:

- [`CLAUDE.md`](CLAUDE.md) documents the conventions and edge cases a fresh
  session can't infer from any single file - the App Actions pattern, the
  403/404/400 ownership matrix, the validator traps that make assertions
  silently wrong, the post-login redirect race, and why the rate limit is
  verified via headers instead of exhausted.
- [`docs/claude-workflow.md`](docs/claude-workflow.md) shows the loop with real
  before/after examples pulled from this repository's git history - including
  nine contract assertions that ran but could never fail, and a test that
  passed for the wrong reason.
- [`.claude/commands/`](.claude/commands/) holds two custom slash commands
  (`/new-boundary-test`, `/new-contract-schema`) that encode this project's
  actual testing patterns, so they're extended rather than re-explained.

The honest summary: the tool is good at producing the *shape* of a test and
consistently wrong about *exact* error strings, so every message asserted in
`cypress/fixtures/` was confirmed against the running API. Notably, none of the
three defects in the defect report were found by the automated suite - they came
from exploratory work.

---

## 6. CI

`.github/workflows/main.yml` builds and starts the same Docker Compose stack
on every push, waits for it to become healthy, then runs the Cypress suite
against it - no external site or service is required.

---

## 7. Cypress documentation this project is based on:
- https://docs.cypress.io/guides/overview/why-cypress
- https://www.cypress.io/blog/2019/01/03/stop-using-page-objects-and-start-using-app-actions/
- https://dev.to/walmyrlimaesilv/how-to-create-custom-commands-with-cypress-3102

Click the badge below to see the Test Report in the Cypress Dashboard:

[![Cypress Sample Project](https://img.shields.io/endpoint?url=https://dashboard.cypress.io/badge/simple/xkdu4i&style=flat&logo=cypress)](https://dashboard.cypress.io/projects/xkdu4i/runs)
