# Quality Summary

**Product:** Budget Tracker — a personal finance application where people
record accounts and track money in and out.
**Audience:** non-technical stakeholders.
**Date:** 3 September 2026.

---

## The short version

The application does what it promises, and the parts that protect people's
money and privacy are solid. Testing found **three defects**, none of which
lose or expose customer data, and all three have a clear, low-risk fix.

The most valuable finding is not on the defect list: **the way the system
behaves when it is busy is safe.** Under sustained concurrent use it slows
down, but it never returns a wrong number and never fails unpredictably. For a
financial product, that is the outcome that matters most.

**Recommendation: ship, with the three fixes scheduled in the next cycle.**
None of them is a release blocker.

---

## What was checked, and what it protects

| Area | Business question it answers | Result |
|---|---|---|
| **Access control** | Can one customer see or change another customer's money? | **No.** Verified exhaustively. |
| **Money arithmetic** | Are balances always right, including when many people use the system at once? | **Yes.** |
| **Data protection** | Can passwords leak, or can someone grant themselves admin rights? | **No.** |
| **Input handling** | Does bad or hostile input get rejected cleanly? | **Yes**, with one gap (Finding 3). |
| **Behaviour under load** | Does the system stay correct and predictable when busy? | **Yes** — it slows, it does not break. |
| **Accessibility** | Can people using assistive technology use it? | **Partially verified** — see limitations. |

### Access control is the area with the highest stakes, and it is the strongest

Most problems in a system like this affect one person's own experience. A
failure in access control is different in kind: it exposes *every* customer's
financial history to *anyone* with an account, and it does so silently — the
system returns a normal-looking success response with someone else's data.
Nothing in day-to-day operation would reveal it.

This was therefore tested as a complete grid rather than as a spot check: every
combination of who is asking, what they are asking for, and what they are trying
to do. The system correctly distinguishes three different situations that are
easy to confuse — *"this isn't yours"*, *"this doesn't exist"*, and *"you aren't
logged in"* — and it never reveals whether someone else's data exists.

**No access-control defects were found.**

---

## Findings

### Finding 1 — Duplicate sign-ups show a confusing error

**Business impact: moderate. Customer-facing. No data at risk.**

If someone double-clicks the sign-up button, or tries to register an email
address at the same moment as another attempt, they see a generic *"Something
went wrong. Please try again."*

The correct message is *"Email already registered."* The difference matters:
the right message tells the customer to log in instead, while the current one
invites them to keep retrying an action that will never succeed. The same
applies when creating an account with a name they already used.

**No duplicate records are ever created** — the data stays correct. This is
purely a case of the system reporting a normal, expected situation as if it
were an unexpected fault.

There is a secondary effect worth noting for operations: because these are
reported as server faults, they generate false alarms that make genuine system
problems harder to spot.

*Fix: small and low-risk. Also recommended: disable buttons while a request is
in progress, which removes the most common trigger.*

---

### Finding 2 — A safety rule is enforced in only one place

**Business impact: low today, higher over time. No customer is affected now.**

The product has a rule that protects financial history: an account that still
has transactions cannot be deleted. That rule works correctly for every
customer today.

However, it is enforced only in the application, not in the database
underneath. An analogy: the door is locked, but the wall behind it isn't built.
Nothing can currently get through the wall — every route into the system goes
through the locked door. The risk is future work: a new bulk-delete feature, a
maintenance script, or a data migration would not be stopped, and would delete
financial records silently.

**Recommendation:** decide this deliberately rather than leaving it implicit.
Either strengthen the database rule, or document that the protection is
application-level. What matters is that the decision is made and recorded — the
fix carries a real risk of side effects, so it should be verified rather than
applied casually.

---

### Finding 3 — Malformed requests are reported as system failures

**Business impact: moderate. Affects integrations, not the web app's own users.**

If any connecting system sends a badly-formed request, the application reports
it as an internal server failure rather than as a bad request.

For a customer using the website, this is invisible. It matters for anyone
integrating with the product: the current response tells them *"our system is
broken, please retry"* when the correct message is *"your request was
malformed, please fix it."* That sends integration partners down the wrong path
and costs support time.

As with Finding 1, it also produces false alarms that dilute genuine alerting.

*Fix: a few lines, shared with Finding 1's fix.*

---

## Behaviour under load

The system was tested with many people using it simultaneously, and the question
asked was deliberately **not** "how fast is it?" but **"does it stay correct
when it is busy?"**

The results:

- **Every balance was arithmetically correct**, under every level of load
  tested.
- **No unexpected failures** occurred at any point.
- **Response times grow when the system is busy** — from a fraction of a second
  at low volume to several seconds at roughly double the capacity of a single
  server.

That last point is a normal and expected characteristic, not a defect. It comes
from the deliberately slow password-scrambling step that protects customer
credentials — a security feature that is *designed* to be computationally
expensive. The practical consequence is a straightforward capacity-planning
fact:

> **Sign-in capacity is roughly 4–5 sign-ins per second per server.** Beyond
> that, customers wait longer, but nothing breaks and nothing becomes incorrect.

If sign-in volume is expected to exceed that, the answer is to run more servers.
This scales almost perfectly and needs no redesign. It is a cost question, not
an engineering risk.

---

## What was not verified

Stated plainly, so confidence is calibrated rather than assumed:

- **Accessibility is only partially verified.** Automated scanning finds roughly
  a third of accessibility problems. Confirming the product genuinely works for
  someone using a screen reader requires a manual audit, which has not been
  done. Two screens are not scanned at all.
- **No endurance testing.** The system was tested under bursts, not over hours
  or days. Problems that accumulate slowly — memory leaks, resource exhaustion —
  would not have been detected.
- **Load results come from a single development machine.** They indicate the
  *shape* of the system's behaviour reliably; they are not a production capacity
  guarantee.
- **One rejection path is untested by design.** When sign-in attempts are
  blocked for exceeding the safety limit, the block itself is confirmed to be
  active and counting, but the final rejection is not exercised — doing so would
  make the rest of the test suite unreliable.

---

## Where the findings came from

Worth noting for how future work should be planned: **the automated test suite
found none of these three defects.**

The suite is thorough and does its job — it confirms that every documented rule
still works, and it is what makes changes safe to release. But by definition it
can only check the questions someone already thought to ask.

All three findings came from *exploratory* work: asking what happens when two
people act at the same instant, what happens when a request arrives malformed,
and whether a rule holds outside the normal path. One was found entirely by
accident and was investigated rather than dismissed.

**Implication:** budget for exploratory testing as an ongoing activity, not as a
one-off. Automation protects what is already known; exploration is what finds
the rest.

---

## Bottom line

| Question | Answer |
|---|---|
| Is customer financial data protected from other customers? | **Yes** — verified exhaustively |
| Are balances correct, including under load? | **Yes** |
| Can credentials leak or privileges be escalated? | **No** |
| Are there release-blocking defects? | **No** |
| Are there defects worth fixing soon? | **Yes — three**, all low-risk fixes |
| Is the system safe when busy? | **Yes** — it slows down rather than failing |

The three defects share a common theme: the system handles *expected* problems
correctly but reports some of them as *unexpected failures*. That is a
presentation and diagnostics issue rather than a correctness one — which is why
none of them blocks release, and why fixing them is inexpensive.
