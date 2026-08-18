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
- Everything runs in Docker, locally and in CI

---

## 1. Architecture

```
CypressDemoProject/
├── server/        Node/Express API (Knex + PostgreSQL, JWT auth, Joi validation)
├── client/        React (Vite) frontend
├── cypress/       The test suite (API, GUI, Contract, A11y)
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

- Cypress specs live under `cypress/e2e/tests/`, split into `API/`, `WEB/`, and
  `A11y/`.
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

---

## 4. CI

`.github/workflows/main.yml` builds and starts the same Docker Compose stack
on every push, waits for it to become healthy, then runs the Cypress suite
against it - no external site or service is required.

---

## 5. Cypress documentation this project is based on:
- https://docs.cypress.io/guides/overview/why-cypress
- https://www.cypress.io/blog/2019/01/03/stop-using-page-objects-and-start-using-app-actions/
- https://dev.to/walmyrlimaesilv/how-to-create-custom-commands-with-cypress-3102

Click the badge below to see the Test Report in the Cypress Dashboard:

[![Cypress Sample Project](https://img.shields.io/endpoint?url=https://dashboard.cypress.io/badge/simple/xkdu4i&style=flat&logo=cypress)](https://dashboard.cypress.io/projects/xkdu4i/runs)
