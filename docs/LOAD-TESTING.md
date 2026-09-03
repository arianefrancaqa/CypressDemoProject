# Load and Failure Testing

**Tool:** [Artillery](https://www.artillery.io/) 2.0.34, installed as a
devDependency.
**Location:** [`perf/`](../perf/)
**Target:** the same Docker Compose stack the functional suite runs against.

```bash
npm run stack:up          # the stack must be running
npm run perf:login        # POST /auth/login under concurrency
npm run perf:transactions # the authenticated transaction journey
npm run perf              # both, sequentially
```

---

## Why Artillery and not k6

k6 is the better tool for sustained performance engineering, but it ships as a
separate Go binary that has to be installed outside npm. Artillery installs
with `npm install`, runs anywhere Node runs, and drops into the existing GitHub
Actions job with no extra setup step. For a probe of this size, matching the
project's existing toolchain was worth more than k6's throughput ceiling.

---

## What is being asserted, and what is not

This is a **resilience probe, not a benchmark.** The numbers below come from a
laptop Docker stack; they are not a capacity statement about any production
deployment, and the report deliberately avoids framing them as one.

The question these tests answer is:

> When several callers arrive at once, does the service stay **correct** and
> **predictable** — or does it start returning wrong answers, unhandled errors,
> and hangs?

That framing changes what gets asserted:

| Asserted | Not asserted |
|---|---|
| No 5xx under any load | Requests per second |
| Every response is one of the statuses the contract allows | Absolute latency as a product SLO |
| A concurrent read returns the **arithmetically correct** balance | Throughput ceiling |
| Latency degradation stays bounded rather than unbounded | Capacity planning figures |
| Back-pressure arrives as a 429 with headers, not a crash | Soak/endurance behaviour |

**The balance assertion is the one that earns its place.** Under concurrency it
is not enough for requests to succeed — the number has to be right. Each virtual
user posts income of 1000.50 and an expense of 300.25 against its own account
and asserts the computed balance is exactly `700.25`. A read path that returned
a stale or partially-summed balance would pass a pure throughput test and fail
this one.

---

## Scenarios

### `perf/login-load.yml`

Registers a unique user, then makes one correct and one incorrect login.
Allowed statuses are `201`, `[200, 429]`, and `[401, 429]` — a 429 is graceful
back-pressure, not a failure. Anything else, notably a 5xx, fails the run.

### `perf/transactions-load.yml`

The full authenticated journey: register → login → create account → post two
transactions → list them → read the balance. Seven requests per virtual user,
ending in the exact-balance assertion.

---

## Results

Measured on the Docker Compose stack (Postgres 16, single Node API container,
6 CPUs available to the container), 3 September 2026.

### Committed configuration — both scenarios pass

| Scenario | VUs | Requests | Assertions | Failures | 5xx | p95 | Exit |
|---|---|---|---|---|---|---|---|
| `login-load.yml` | ~110 | 330 | 440 passed | 0 | 0 | **273 ms** | 0 |
| `transactions-load.yml` | 170 | 1,190 | 1,530 passed | 0 | 0 | **290 ms** | 0 |

The transactions run's 1,530 assertions include 170 exact-balance checks — every
concurrent user got arithmetically correct data.

### The headline finding: where the login path saturates

Arrival rate was swept against the login scenario, restarting the API between
runs so the rate limiter never contaminated a measurement:

| Arrivals/sec | p95 | Correctness assertions | 5xx | Timeouts |
|---|---|---|---|---|
| 2 | 153 ms | all passed | 0 | 0 |
| 3 | 242 ms | all passed | 0 | 0 |
| 5 | 2,780 ms | all passed | 0 | 0 |
| 8 | 9,047 ms | all passed | 0 | 0 |

Latency rises by **37×** between 3 and 8 arrivals/sec, while **correctness never
degrades at all**. That is the definition of graceful degradation: the system
slows down and queues, rather than failing, corrupting, or lying.

### Root cause of the knee — measured, not guessed

Login is CPU-bound on password hashing. Measured inside the API container:

```
bcryptjs hash(cost 10): 82 ms
bcryptjs compare      : 69 ms
=> per virtual user (1 hash + 2 compares): 220 ms of single-threaded CPU
```

The project uses `bcryptjs` — the **pure-JavaScript** implementation. Unlike
native `bcrypt`, it does not offload to libuv's thread pool, so it blocks the
event loop for the full duration. One Node process therefore has a hard ceiling
of roughly:

```
1000 ms/sec ÷ 220 ms/user ≈ 4.5 virtual users/sec
```

The measured knee sits between 3/sec (242 ms) and 5/sec (2,780 ms) — exactly
where that arithmetic predicts. The container has 6 CPUs, but a single Node
process cannot use them for this work.

**This is a capacity characteristic, not a defect.** Slow password hashing is
the entire point of bcrypt. The finding is that *login throughput per process is
governed by bcrypt cost*, which is what makes it a horizontal-scaling and
cost-factor decision rather than a code fix.

**Recommendations, in order of value:**

1. Run more API processes/replicas. Authentication scales horizontally almost
   perfectly, and this is the standard answer.
2. If vertical headroom is needed first, switch `bcryptjs` → native `bcrypt`,
   which offloads to the thread pool and would let the container's other 5 CPUs
   contribute.
3. Re-evaluate `SALT_ROUNDS = 10` against a current threat model — deliberately,
   with security input. It is a security parameter first and a performance one
   second, and should not be lowered to make a graph look better.

The committed gate runs at **3 arrivals/sec**, inside capacity, so it fails on
genuine regressions rather than on a known ceiling.

---

## The login rate-limit budget

The login limiter is per-IP, in-memory, on a 15-minute window, with **no reset
hook**. The Docker test stack raises it to `LOGIN_RATE_LIMIT_MAX=1000`.

Every load run spends from that same allowance as the Cypress suite. The
scenarios are therefore sized deliberately — roughly 200 slots for the login
scenario and 170 for the transaction journey — and the reasoning is written at
the top of each config so nobody raises `arrivalRate` without seeing it.

This is not theoretical. **While sweeping arrival rates for the table above, the
sweep exhausted all 1,000 slots**, and a subsequent measurement recorded an
implausibly *good* p95 because most logins were being answered by the limiter
instead of by bcrypt. The result was discarded and the API restarted between
runs.

Two things came out of that:

- **A methodology rule:** restart the API between rate-sweep runs, and check
  `RateLimit-Remaining` before trusting a number that looks too good.
- **An unplanned resilience result:** with the limiter fully exhausted, the API
  returned correct `429`s carrying `RateLimit-Policy`, `RateLimit-Limit`,
  `RateLimit-Remaining: 0` and `RateLimit-Reset` — **with zero 5xx**. Saturation
  behaviour was confirmed by accident, which is the most honest way to confirm
  anything.

---

## Trusting the harness

The first version of these scenarios **reported a clean pass while asserting
nothing.** A patch to the config had removed the `plugins: expect: {}` block, and
Artillery silently ignores every `expect:` clause when that plugin is not
enabled — no warning, exit code 0.

It was caught by mutation testing the harness: the expected balance was changed
from `700.25` to `999.99`, and the run was expected to fail. It passed. That is
the tell.

Both configs now carry the check in their comments, and the procedure is:

```bash
# Break an assertion on purpose; the run MUST fail with exit code 21.
sed -i 's/- 700.25/- 999.99/' perf/transactions-load.yml
npx artillery run perf/transactions-load.yml   # expect: exit 21, plugins.expect.failed > 0
git checkout perf/transactions-load.yml
```

Confirmed behaviour after the fix: clean run → exit `0`, `plugins.expect.ok:
1530`. Mutated run → exit `21`, `plugins.expect.failed: 3`.

This is the same failure mode as the unreturned `schemaValidation()` calls
documented in [`claude-workflow.md`](./claude-workflow.md) — an assertion that
cannot fail is worse than no assertion, because it reports coverage that does
not exist. Two independent occurrences in one codebase is a good argument for
mutation-checking any new assertion mechanism before trusting it.

### Two Artillery behaviours worth knowing

- **`maxErrorRate` does not catch expectation failures.** `vusers.failed` counts
  scenario-level errors — connection failures, capture failures — and stays at
  `0` when an `expect:` clause fails. The expect plugin's own non-zero exit code
  (21) is what fails the run.
- **A custom `afterResponse` hook suppresses that exit code.** With a processor
  hook attached, a failing expectation still increments
  `plugins.expect.failed` but the process exits `0`. An earlier draft used such
  a hook to count 5xx responses; it was removed, because a hook that silences
  the failure signal costs more than the counter is worth.

---

## Known limits of this work

- **Single-host, laptop-scale.** Client and server share a machine, so the
  client competes for the CPU it is measuring. Absolute numbers are indicative
  only; the *shape* of the curve and the correctness results are the findings.
- **No sustained or soak testing.** Nothing here would surface a memory leak,
  connection-pool exhaustion, or slow degradation over hours.
- **Not run in CI by default.** These are opt-in (`npm run perf`). Adding them
  to every push would consume the shared login rate-limit budget and make the
  functional suite flaky — the same trade already recorded in
  [`TEST-STRATEGY.md`](./TEST-STRATEGY.md).
- **DEF-001 is not covered by these scenarios.** Artillery's virtual users are
  independent, so they rarely collide on the *same* unique value. The
  duplicate-submission race is reproduced by the dedicated script in the defect
  report instead.
