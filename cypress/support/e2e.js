// ***********************************************************
// This support/e2e.js file is processed and loaded automatically
// before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import "./WEB/webCommands";
import "./API/apiCommands";
import "./A11y/a11yCommands";
import "cypress-axe";
import "cypress-mochawesome-reporter/register";

// Runs once before each spec file. Without this, every run permanently
// accumulates test users/accounts/transactions in the shared local database,
// which eventually makes list-based assertions (e.g. the admin user list)
// slow enough to miss Cypress's default retry timeout.
before(() => {
  cy.task("resetDatabase");
});
