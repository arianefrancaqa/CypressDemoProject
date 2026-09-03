---
description: Derive a Joi contract schema from a real API response, applying this project's contract-testing conventions
argument-hint: <endpoint> — e.g. "GET /accounts/:accountId/balance"
---

Generate a Joi contract schema for: **$ARGUMENTS**

## Step 1 — Get a real response, do not imagine one

Call the endpoint against the running stack and use the actual body. If it
needs authentication, register a throwaway user first:

```bash
# register -> login -> capture token -> call the endpoint
curl -s -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Schema Probe","email":"probe-'$RANDOM'@example.com","password":"Senha1234"}'
```

Also capture the **error** response for the same endpoint (a 400, 403, 404, or
409 as applicable). Both paths need contract coverage.

## Step 2 — Read the serializer

Find the `serialize()` function in the relevant `server/src/controllers/*.js`.
It is the authoritative field list — the model returns snake_case database
columns, and the controller maps them to the camelCase the API actually
exposes. Schema fields must match the serializer, not the table.

## Step 3 — Apply this project's type conventions

These are not defaults; they encode real behaviour of this API, and getting
them wrong produces a schema that passes while checking nothing useful:

| Value | Use | Why |
|---|---|---|
| Any `id`, `userId`, `accountId` | `Joi.string().guid().required()` | Postgres `uuid` columns |
| `createdAt` / `updatedAt` | `Joi.string().isoDate().required()` | `timestamptz`, serialised as ISO 8601 |
| A transaction `date` | `Joi.string().required()` — **not** `.isoDate()` | `config/pgTypes.js` overrides the DATE parser so it returns a plain `"YYYY-MM-DD"` string; `.isoDate()` would reject it |
| `amount`, `balance` | `Joi.number().required()` | The column is `decimal(12,2)`, which node-postgres returns as a **string**; the controller coerces with `Number()` |
| `role` | `Joi.string().valid("user", "admin").required()` | Backed by the `users_role_check` constraint |
| `type` | `Joi.string().valid("income", "expense").required()` | Backed by `transactions_type_check` |
| `email` | `Joi.string().required()` | Deliberately not `.email()` — the point is shape, and the format rule is already covered by validation tests |

Mark **every** field `.required()` and close the object with `.required()`.
A contract that tolerates missing fields does not detect the regression it
exists to catch. For a list endpoint, wrap it:

```js
const xListResponseSchema = Joi.array().items(xResponseSchema).required();
```

## Step 4 — Write the file

`cypress/contract/schemas/<resource>.contract.js`, matching the existing style
— `require("joi")` at the top, named `export { ... }` at the bottom:

```js
const Joi = require("joi");

const balanceResponseSchema = Joi.object({
  balance: Joi.number().required(),
}).required();

export { balanceResponseSchema };
```

Do **not** write a new error schema. Every non-2xx response in this API uses
the same envelope, and `errorResponse.contract.js` already covers it:

```js
const { errorResponseSchema } = require("../../../contract/schemas/errorResponse.contract");
```

## Step 5 — Wire it into the spec correctly

This is the part that is easy to get wrong in a way that still looks right:

```js
cy.request({ ... }).then((response) => {
  expect(response.status).to.eq(200);
  return schemaValidation(response.body, balanceResponseSchema);
});
```

- **`return` it.** `schemaValidation` is `async`. Without the `return`, Cypress
  never awaits it: a broken contract passes silently, or surfaces as an
  unhandled rejection inside a later, unrelated test. This was a real bug
  across nine call sites, fixed in commit `03b55ad`.
- **Put it last**, after the plain `expect`s — returning it ends the chain.

## Step 6 — Prove the schema can actually fail

Before trusting it, break it on purpose: change a `Joi.number()` to
`Joi.string()`, or add a `.required()` field the response does not contain, and
confirm the test **fails**. Then revert.

An assertion that cannot fail is worse than no assertion, because it reports
coverage that does not exist. This project has hit that failure mode twice —
see `docs/claude-workflow.md` and `docs/LOAD-TESTING.md`.

## Step 7 — Record it

Add the schema to the CONTRACT table in `docs/TRACEABILITY.md`.
