# Working with Claude Code on this project

This project is AI-augmented by design. That claim is only worth anything if
it is specific, so this document records **how** the tool is actually used
here, with real before/after cases taken from this repository's git history.

The short version: the value is not in the prompting. It is in noticing when a
generated test is *wrong in a way that still passes*, diagnosing why, and then
writing that rule down in [`CLAUDE.md`](../CLAUDE.md) so neither the tool nor a
future human repeats it. Every example below is a real commit.

---

## The loop

```
draft  ──►  run against the real stack  ──►  read the failure honestly
  ▲                                                     │
  │                                                     ▼
  └──── write the rule into CLAUDE.md ◄──── ask "would this have
                                            passed for the wrong reason?"
```

The last question is the one that matters. A test that fails is cheap — it
tells you immediately. A test that **passes for the wrong reason** is the
expensive defect in a suite, because it silently reports coverage that does not
exist. Two of the three cases below are exactly that.

The output of the loop is not a corrected file. It is a corrected *rule*, in
`CLAUDE.md`, that prevents the same class of mistake in files that do not exist
yet.

---

## Case 1 — Contract assertions that could never fail

**Commit [`03b55ad`](https://github.com/arianefrancaqa/CypressDemoProject/commit/03b55ad) · 9 call sites across 4 spec files**

### Before

```js
cy.apiCreateAccount(token, "Carteira").then((response) => {
  expect(response.status).to.eq(201);
  expect(response.body.name).to.eq("Carteira");
  schemaValidation(response.body, accountResponseSchema);
});
```

This is the natural way to write it, and it is what a first draft produces. It
also does nothing.

`schemaValidation()` is `async` — it returns a promise. Cypress only
incorporates a promise into its command queue if the `.then()` callback
**returns** it. Without the `return`, the schema check is fired and abandoned:
a genuinely broken response contract passes green, and if the rejection lands
at all it surfaces as an unhandled error inside whatever unrelated test happens
to be running when it resolves.

The suite reported contract coverage across every endpoint. It had none.

### After

```js
cy.apiCreateAccount(token, "Carteira").then((response) => {
  expect(response.status).to.eq(201);
  expect(response.body.name).to.eq("Carteira");
  return schemaValidation(response.body, accountResponseSchema);
});
```

Two rules came out of this, and both went into `CLAUDE.md` §3:

1. **Always `return` the `schemaValidation()` call.**
2. **Put it last**, after the plain `expect`s — returning it ends the chain, so
   assertions written after it read as though they depend on it when they do
   not.

The second rule is why three of the nine sites were also *reordered*, not just
prefixed with `return`. That ordering constraint is invisible from any single
line of code, which is precisely the kind of thing that belongs in a project
memory file rather than in a code review comment.

---

## Case 2 — A test that passed, but not for the reason it claimed

**Commit [`03b55ad`](https://github.com/arianefrancaqa/CypressDemoProject/commit/03b55ad) · `cypress/e2e/tests/API/auth.spec.js`**

### Before

```js
it("Registering with an already-registered email returns 409, not a crash", () => {
  const email = faker.internet.email();
  cy.apiRegister({ name: "QA Test", email, password: VALID_PASSWORD });
  cy.apiRegister({ name: "QA Test 2", email, password: VALID_PASSWORD }).then((response) => {
    expect(response.status).to.eq(409);
  });
});
```

`"QA Test 2"` is the obvious name for a second fixture user. It is also
invalid input to this API: the person-name validator is `/^\p{L}+...$/u` —
Unicode **letters only, no digits**. So the second request never reached the
duplicate-email check at all. It was rejected at the validation layer with a
**400**, and the assertion for **409** failed.

Here the failure was loud, which made it easy. The instructive part is the
near-miss: account names use a *different* pattern that **does** allow digits
(`[\p{L}\p{N}]`). Had this been an account-name fixture, `"Carteira 2"` would
have been accepted and the test would have passed — for the right reason, by
luck. The same mistake in the same shape is sometimes caught and sometimes not.

### After

```js
// "QA Test Two" not "QA Test 2" - the name validator rejects digits, and
// a 400 there would mask the 409 this test is actually checking for.
cy.apiRegister({ name: "QA Test Two", email, password: VALID_PASSWORD }).then((response) => {
```

The rule written into `CLAUDE.md` §4 is deliberately the *general* one, not
"use QA Test Two":

> **Person names reject digits; account names allow them.** A fixture user
> called `"QA Test 2"` fails with a 400 that **masks the 409 the test was
> actually checking for**.

Naming the asymmetry between the two validators is what generalises. It is also
the entry that has since prevented the most repeat mistakes, because the two
patterns look almost identical when skimmed.

---

## Case 3 — Fixing the harness instead of weakening the test

**Commit [`5ae5284`](https://github.com/arianefrancaqa/CypressDemoProject/commit/5ae5284) · `cypress/support/WEB/webCommands.js` and 3 specs**

Two distinct problems surfaced while building out the data-driven checklists,
and both had a tempting wrong fix.

### 3a. `cy.type("")` throws

```js
// Before - every "empty value" checklist row died on the harness
cy.get(loginPage.emailInput).clear().type(email);
```

Cypress throws on an empty string, so the "Empty value" row of every boundary
checklist errored before the app was ever asked to respond. The tempting fix is
to delete those rows — losing genuine coverage of a real validation rule to
work around a tooling constraint.

```js
// After - .clear() alone already leaves the field empty
function clearAndType(getChainable, value) {
  const cleared = getChainable.clear();
  return value ? cleared.type(value) : cleared;
}
```

### 3b. The post-login redirect race

```js
cy.fillLoginFormAndSubmit({ email, password: VALID_PASSWORD });
cy.visit("/admin/users");
cy.location("pathname").should("eq", "/"); // passes... sometimes correctly
```

`fillLoginFormAndSubmit` only clicks. The client's async handler then writes
the token to `localStorage` and navigates. Visiting another route before that
lands races the token write.

This one is worth dwelling on, because the test above is the **admin-route
authorization test** — its entire purpose is to prove that a regular user
attempting `/admin/users` is redirected to `/`. Without the wait, a lost race
also redirects to `/`, because there is no session yet. The assertion passes
either way. A real regression in the role check would not have been caught.

```js
// After
cy.fillLoginFormAndSubmit({ email, password: VALID_PASSWORD });
// Wait for the post-login redirect first - otherwise a slow token write
// could make the next visit bounce back to "/" for the wrong reason
// (no session yet) instead of the admin-authorization check this test
// is actually meant to exercise.
cy.location("pathname").should("eq", "/");

cy.visit("/admin/users");
cy.location("pathname").should("eq", "/");
```

The same wait was added to `accountDetail.spec.js` and `a11yDashboard.spec.js`
in the same commit — in the a11y case, the scan had been running against a
login page that had not navigated away yet, so it was auditing the wrong page
entirely.

`CLAUDE.md` §5 now carries both rules, including the reasoning about *why* the
admin test is the dangerous one.

---

## What actually goes into CLAUDE.md

Not everything. The file is only useful if it stays read-worthy, so the bar is:

**Include** — anything where the correct behaviour is invisible from the code
in front of you:

- Asymmetries between things that look alike (the two name validators; 403 vs
  404 vs 400 for ids).
- Framework behaviour with silent failure modes (unreturned async assertions,
  `cy.type("")`, native date inputs).
- Deliberate decisions that look like bugs (`stripUnknown` returning 201 for an
  injected `role: "admin"`; the rate limit raised to 1000 in Docker).
- Shared state whose blast radius is not local (the per-spec database reset).

**Leave out** — anything the code already says plainly. A list of endpoints, or
which fixture files exist, is a maintenance burden that goes stale and teaches
nothing.

The test for a good entry: *if this were missing, would a competent engineer
write something that passes for the wrong reason?*

---

## Extending the tool, not just prompting it

Two patterns in this repo are mechanical enough to encode as commands rather
than re-explain each time — see [`.claude/commands/`](../.claude/commands/):

| Command | What it does |
|---|---|
| `/new-boundary-test` | Scaffolds a data-driven boundary/security checklist for a field, in the fixture-plus-`.forEach` shape, with the parametric length cases computed in the spec |
| `/new-contract-schema` | Derives a Joi contract schema from a real API response, applying this project's conventions (`.guid()` for ids, `Joi.string()` for dates, `.required()` throughout) |

Both encode conventions that are otherwise a paragraph of prompt every time,
and both deliberately end by asking for the generated assertions to be run
against the live stack before being trusted.

---

## Honest limits

- The tool is fast at producing the *shape* of a test and consistently wrong
  about the *exact* error strings. Every message in `cypress/fixtures/*.json`
  was confirmed against the running API, not accepted from a draft.
- Case 1 is the cautionary one: nine files of plausible, well-structured,
  reviewed-looking code that asserted nothing. It was caught by running the
  suite against a deliberately broken response, not by reading the diff.
- `CLAUDE.md` is a living file and can drift from the code. The rule is that
  the code wins, and the note gets fixed in the same commit.
