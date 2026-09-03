"use strict";

// Artillery processor shared by the scenarios in this folder.
//
// Every virtual user registers its own account, for the same reason the
// Cypress suite generates users with faker: shared fixture identities make
// runs order-dependent, and here they would also collide on the API's
// per-user unique constraints and produce 409s that look like failures.

let counter = 0;

function uniqueUser(context, events, done) {
  counter += 1;
  const unique = `${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`;

  context.vars.email = `perf-${unique}@example.test`;
  // The person-name validator accepts Unicode letters only - no digits, no
  // hyphens between digits. A generated name containing the unique suffix
  // would be rejected with a 400 and would look like a load failure.
  context.vars.name = "Perf User";
  context.vars.password = "Senha1234";
  context.vars.accountName = `Conta ${unique.replace(/[^a-z0-9]/gi, "")}`;

  return done();
}

// A transaction date must be between 2000-01-01 and tomorrow (UTC), computed
// server-side per request. Hardcoding a date would start failing the day the
// ceiling moves past it.
function todayIsoDate(context, events, done) {
  context.vars.today = new Date().toISOString().slice(0, 10);
  return done();
}

// Records the status of every response so the run summary distinguishes
// "shed load deliberately" (401/429) from "fell over" (5xx). Artillery's
// built-in http.codes.* counters do this too; this hook additionally fails
// loudly on the specific thing these scenarios exist to detect.
function countUnexpectedServerErrors(requestParams, response, context, events, done) {
  if (response.statusCode >= 500) {
    events.emit("counter", "degradation.server_error_5xx", 1);
  }
  if (response.statusCode === 429) {
    events.emit("counter", "degradation.rate_limited_429", 1);
  }
  return done();
}

module.exports = { uniqueUser, todayIsoDate, countUnexpectedServerErrors };
