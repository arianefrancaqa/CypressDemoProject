---
description: Scaffold a data-driven boundary and security checklist for a field, following this project's fixture + .forEach convention
argument-hint: <field> on <endpoint or screen> — e.g. "description on POST /accounts/:accountId/transactions"
---

Scaffold a boundary-value and security checklist for: **$ARGUMENTS**

This project already has one consistent way of doing this. Follow it exactly
rather than inventing a variation — the value of the pattern is that every
field in the app is covered the same way.

## Step 1 — Read the rule before writing anything

Find the Joi schema in `server/src/validators/` that governs this field and
read it. Do not write expected messages from memory or infer them from the
field name. Note specifically:

- min/max length, and whether the limit is on the string or a number
- the regex pattern, if any, and exactly what it excludes
- any `.messages({ ... })` override — that custom text is what the API returns
- whether the field is `.required()` or optional

Remember two project-specific traps:

- `middleware/validate.js` **strips the double quotes** Joi puts around field
  names. The API returns `name length must be at least 2 characters long`, not
  `"name" length must be...`.
- Person names reject digits; account names allow them. They look alike and
  are different rules.

## Step 2 — Build the checklist rows

Cover these categories, keeping only the ones that genuinely apply to this
field, and adding any that are specific to it:

- Empty value
- Value made only of spaces
- Leading space · trailing space · doubled internal space
- HTML tags (`<b>Bold</b>`)
- XSS payload (`<script>alert('xss')</script>`)
- SQL-injection payload (`' OR '1'='1`)
- Non-alphabetic characters where letters are expected
- Below the minimum length (one character under)
- Above the maximum length (parametric — see step 4)
- For numbers: zero, negative, excess decimal places, above the maximum
- For enums: a plausible value that is not in the allowed set
- For dates: one day before the floor, one day past the ceiling, wrong format

## Step 3 — Put the static rows in a fixture

Create or extend `cypress/fixtures/<field>Checklist.json`. Use the shape that
matches the endpoint:

```json
[
  {
    "category": "Space at the beginning",
    "value": " Leading",
    "error": "<exact message from the validator>"
  }
]
```

For transaction-style endpoints where one field varies against an otherwise
valid payload, use `fields` instead of `value`:

```json
[
  {
    "category": "Amount - zero",
    "fields": { "amount": 0 },
    "error": "amount must be greater than 0"
  }
]
```

## Step 4 — Compute the parametric length cases in the spec

Never type a 120-character literal into a fixture. Append length boundaries in
code, so they stay readable and cannot silently rot when a limit changes:

```js
const checklist = fixture.concat([
  {
    category: "More than the maximum length (120 chars)",
    value: "A".repeat(120),
    error: "name length must be less than or equal to 100 characters long",
  },
]);
```

## Step 5 — Generate one `it()` per row

API-level:

```js
describe("<METHOD> <path> - <Field> Boundary & Security Checklist", () => {
  checklist.forEach(({ category, value, error }) => {
    it(`${category} is rejected`, () => {
      freshUser().then((token) => {
        cy.apiCreateAccount(token, value).then((response) => {
          expect(response.status).to.eq(400);
          expect(response.body.details[0].message).to.eq(error);
        });
      });
    });
  });
});
```

UI-level, asserting the rendered field error:

```js
cy.get(registerPage.fieldError("name")).should("contain.text", error);
```

Then add **at least one positive case** proving the rule rejects only what it
should — e.g. "Digits are allowed in account names (unlike person names)". A
checklist of rejections alone would pass against a field that rejects
everything.

## Step 6 — Verify against the running API, then trust it

Run the new spec against the live stack (`npm run stack:up` first). Every
`error` string must match byte for byte.

**If a case fails, do not adjust the expected message to match the response
until you have read the validator and confirmed which side is wrong.** In this
repo the application is part of the deliverable, so a mismatch is a real
question: either the test is wrong, or the validation rule is.

## Step 7 — Record it

Add or update the corresponding row in `docs/TRACEABILITY.md`, citing the new
`describe` name.
