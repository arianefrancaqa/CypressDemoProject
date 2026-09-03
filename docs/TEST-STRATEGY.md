# Test Strategy

**System under test:** Budget Tracker — a personal finance application where
users hold accounts and record income/expense transactions against them.
**Document status:** living; updated alongside coverage changes.

---

## 1. Scope

### In scope

| Layer | What is covered | Where |
|---|---|---|
| **API** | Authentication, authorization/ownership, validation rules, business rules, error contracts | `cypress/e2e/tests/API/` |
| **Contract** | Response-shape conformance for every endpoint, success **and** error envelopes | `cypress/contract/` |
| **Data** | Constraints and referential integrity asserted directly against Postgres | `cypress/e2e/tests/DATA/` |
| **Web** | User-facing journeys, client-side routing/role guards, error rendering | `cypress/e2e/tests/WEB/` |
| **Accessibility** | Automated WCAG scanning (axe-core) on all primary screens | `cypress/e2e/tests/A11y/` |
| **Performance / resilience** | Graceful degradation under concurrency on the two hot endpoints | `perf/` |

### Out of scope, and why

- **Unit tests of application internals.** This repository's purpose is
  demonstrating black-box and integration quality engineering. The app is the
  fixture, not the deliverable. In a production engagement, unit coverage
  belongs to the implementing team; the concern would be raised as a gap, not
  filled from here.
- **Cross-browser and mobile matrices.** The frontend is deliberately minimal
  and unstyled — a browser matrix would test the harness, not the product.
- **Sustained load and capacity planning.** The performance work here is a
  *resilience probe*, not a benchmark; see §6 and `docs/LOAD-TESTING.md` for
  the distinction and its limits.
- **Manual accessibility auditing.** Automated axe scanning catches roughly a
  third of WCAG issues. This limit is stated rather than papered over — see §7.

---

## 2. Risk-based prioritization

Priority is assigned by **impact × likelihood**, not by layer. The ranking
below drives what runs on every commit and what blocks a release.

### P0 — Authorization and IDOR

**Covered by:** `API/authorization.spec.js`, `API/users.spec.js`,
`WEB/adminUsers.spec.js`

Authorization is P0 here for four reasons, in order of weight:

1. **The blast radius is other people's money.** Every other failure class in
   this system degrades one user's own experience. A broken ownership check
   exposes *every* user's financial history to *any* authenticated attacker.
   Severity is not proportional to the size of the bug — a single missing
   check leaks the entire dataset.
2. **It fails silently.** A validation regression produces a visible error; a
   broken ownership check produces a **200 with someone else's data**. Nothing
   in the application surfaces it. If it is not tested, it is not observed —
   possibly for as long as the defect exists.
3. **The surface is combinatorial and grows with every feature.** Ownership is
   not one rule but *actor × resource × verb*. Two resources and five verbs
   already give a matrix no one verifies reliably by hand, and each new
   endpoint multiplies it. Broken object-level authorization has remained at or
   near the top of the OWASP API Security Top 10 precisely because it scales
   faster than manual review does.
4. **It is cheap to test and expensive to discover in production.** The entire
   matrix runs in seconds against the API, with no UI involved. There is no
   economic argument for deprioritizing it.

The coverage is deliberately a **matrix**, not a sample: user A / user B /
admin × {account, transaction} × {read, update, delete, list, create}. It
asserts three distinct outcomes rather than "not 200":

- **403** — the resource exists but is not yours
- **404** — the resource does not exist
- **401** — no valid credentials, *without* revealing whether the resource
  exists

Keeping 403 and 404 distinct is itself the security property under test: an
endpoint that collapses them into one status leaks resource existence to an
unauthorized caller, and one that returns 403 for an unauthenticated request
leaks it to an anonymous one.

### P1 — Data integrity and business rules

**Covered by:** `API/accounts.spec.js`, `API/transactions.spec.js`,
`DATA/dataIntegrity.spec.js`

Financial data that is silently wrong is worse than an outage, because it is
trusted. Balance arithmetic, the delete-blocking rule for accounts with
transactions, per-user case-insensitive account-name uniqueness, and the
amount/date boundaries all sit here.

This tier is tested at **two layers deliberately**. An API test proves the
application enforces a rule; it says nothing about whether the rule survives
any other path to the data — a migration, an admin script, a future bulk
endpoint. Asserting the constraint at the database layer is what distinguishes
"the happy path enforces this" from "this cannot be violated." That distinction
produced a real finding — see `docs/sample-defect-report.md`.

### P2 — Authentication and input validation

**Covered by:** `API/auth.spec.js`, `WEB/login.spec.js`, `WEB/register.spec.js`

Credential handling (non-enumerable login failures, no password hashes in any
response, rate-limit headers present, injected `role` fields ignored) and the
boundary/security checklist applied to every text input.

High likelihood, contained impact — validation failures are loud and affect the
submitting user only. The systematic checklist treatment (spaces, HTML, XSS,
SQL-injection shapes, min/max length, empty values) matters more than any
individual case: it is the *consistency* across every field that gives
confidence, and it is cheap to extend to new fields.

### P3 — Presentation, accessibility, and journeys

**Covered by:** `WEB/dashboard.spec.js`, `WEB/accountDetail.spec.js`,
`A11y/*.spec.js`

Real but recoverable. A rendering defect is visible and reportable by users; an
authorization defect is not. Accessibility sits here on impact ranking only —
it is treated as non-negotiable coverage regardless of tier.

### Deliberately not tested: rate-limit exhaustion

The login limiter's counter is in-memory, per-IP, on a 15-minute window, with
no reset hook. Every spec authenticates from the same runner IP. A test that
exhausted the limit would fail every subsequent login in the run, and the
failures would surface far from their cause.

The behaviour is therefore verified through `ratelimit-limit` and
`ratelimit-remaining` response headers and their decrement across requests —
which proves the limiter is engaged and counting. The 429 path itself is
**accepted as untested in the main suite**; covering it requires a dedicated
run against a stack booted with a low `LOGIN_RATE_LIMIT_MAX`. This is a
conscious trade of coverage for suite reliability, recorded here rather than
left implicit.

---

## 3. Test environments

| Environment | Composition | Purpose | Data |
|---|---|---|---|
| **Local** | `docker compose` — Postgres 16, API, frontend | Development, debugging, interactive runs | Ephemeral; volume wiped by `npm run stack:down` |
| **CI** | Identical Compose stack on a GitHub Actions runner | Gate on every push | Ephemeral; created and destroyed per run |

There is deliberately **one stack definition**, used by both. Local and CI
differ only in credentials (throwaway values in the workflow file) — removing
"works on my machine" as a category of failure.

**No external dependencies.** No third-party demo site, no shared staging
environment, no fixture server. The suite cannot fail because someone else's
site changed, and it cannot be flaky because of a network hop it does not
control.

### Test data

- **Generated per test** with `@faker-js/faker`. No shared fixture users, so
  specs cannot collide or depend on execution order.
- **Reset per spec file** via `cy.task("resetDatabase")`, which deletes every
  user except the seeded admin; accounts and transactions cascade away.
  Prevents unbounded accumulation, which was previously slow enough to breach
  Cypress's default retry timeout on list assertions.
- **One fixed identity:** the admin seeded at boot. There is no self-service
  path to the admin role, by design — privilege escalation is a thing to be
  tested, not a convenience to be offered.

---

## 4. Entry criteria

Before a suite run is considered meaningful:

- [ ] All three containers report **healthy** (`docker compose ps`); the API
      answers `GET /api/health`.
- [ ] Migrations and the admin seed have run (automatic on boot).
- [ ] The frontend is served and reachable on `:8080`.
- [ ] `LOGIN_RATE_LIMIT_MAX` is raised for the test stack (otherwise the run
      exhausts the real limit and cascades into false failures).

`npm run test:e2e` enforces this via `start-server-and-test`; CI enforces it
with an explicit `wait-on` step. A run started against a partially healthy
stack is discarded, not interpreted.

## 5. Exit criteria

A build is releasable when:

| Criterion | Threshold |
|---|---|
| P0 authorization specs | **100% pass. No exceptions, no known-fails.** |
| P1 data-integrity and business-rule specs | 100% pass |
| P2 / P3 specs | 100% pass, or a documented defect with an accepted-risk sign-off |
| New/changed behaviour | Mapped in `docs/TRACEABILITY.md` |
| Accessibility | No new critical or serious axe violations |
| Open defects | None at Critical or High severity |
| Flake | Zero tolerance — a quarantined test is an open defect, not a passing build |

The asymmetry is intentional. A P3 rendering defect can ship with a note
attached; a P0 authorization failure cannot ship at all, because there is no
version of "we accepted the risk" that survives contact with a data breach.

---

## 6. Automated vs. manual

### Automated — and why

| Area | Rationale |
|---|---|
| Authorization matrix | Combinatorial; unverifiable by hand at any useful frequency |
| Boundary/security checklists | Repetitive, high-volume, exact-string assertions; data-driven from fixtures |
| Contract schemas | Response-shape drift is invisible to human review until a client breaks |
| Business rules | Must be re-proven on every change; regression risk is permanent |
| Database constraints | Cheap to assert, and the only way to prove a rule holds outside the API |
| A11y scanning | Deterministic rule-checking is exactly what machines are good at |
| Concurrency probe | Not reproducible by hand at all |

### Manual — and why

| Area | Rationale |
|---|---|
| **Exploratory testing** | Finds what the strategy did not think to specify. Automation only ever confirms what was already imagined; every check in this suite exists because a human first wondered about it. |
| **Accessibility with real assistive technology** | Automated scanning catches roughly 30% of WCAG issues. It cannot tell you whether a screen-reader announcement is *comprehensible*, whether focus order is *sensible*, or whether an error message is *findable*. |
| **Usability and error-message quality** | The API returns `name must contain only letters, single spaces, hyphens or apostrophes` — machine-verifiable as present, but only a human can judge whether a user knows what to do next. |
| **Visual and layout review** | Not automated here; a screenshot-diff tool would add maintenance cost disproportionate to the value on a deliberately minimal UI. |
| **Defect triage and severity assignment** | A judgement about business impact, not a computable property. |

### The deciding question

Automate when the check is **objective, repeatable, and its cost of running is
lower than its cost of being wrong**. Keep it manual when it requires
**judgement about human experience**, or when it is **exploratory by nature**.

The trap this strategy tries to avoid is treating a green suite as equivalent
to quality. The suite proves that known rules still hold. It says nothing about
the rules nobody wrote down — which is why exploratory testing stays a
first-class activity, and why the finding in
`docs/sample-defect-report.md` came from asking a question the suite had not
been built to answer.

---

## 7. Known gaps

Recorded openly rather than discovered later:

1. **Concurrency was untested before this iteration**, and asking the question
   found a reproducible defect immediately (`docs/sample-defect-report.md`).
   Single-request-at-a-time testing is a blind spot in most API suites.
2. **The 429 rate-limit path is not covered** in the main suite — see §2.
3. **Automated a11y scanning covers roughly a third of WCAG criteria.** The
   remainder requires manual audit with assistive technology.
4. **No sustained load or soak testing.** The performance work probes failure
   behaviour under brief concurrency, not capacity over time.
5. **`cypress/support/**/*.d.ts` and `cypress/payloads/login.json` are stale**
   leftovers from a previous target application and describe commands that no
   longer exist. Documentation debt, tracked as such.
