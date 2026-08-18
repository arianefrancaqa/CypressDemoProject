require("dotenv").config();
const { defineConfig } = require("cypress");
const { Client } = require("pg");

// Cypress runs on the host, so it reaches Postgres via the port docker-compose
// publishes (localhost:5432), using the same credentials from the root .env.
const DATABASE_URL =
  process.env.CYPRESS_DATABASE_URL ||
  `postgres://${process.env.POSTGRES_USER || "budget_user"}:${
    process.env.POSTGRES_PASSWORD || "budget_pass"
  }@localhost:5432/${process.env.POSTGRES_DB || "budget_tracker"}`;

module.exports = defineConfig({
  projectId: "xkdu4i",
  video: false,

  e2e: {
    baseUrl: "http://localhost:8080/",
    specPattern: "cypress/e2e/**/*.spec.js",
    supportFile: "cypress/support/e2e.js",
    setupNodeEvents(on, config) {
      on("task", {
        async resetDatabase() {
          const client = new Client({ connectionString: DATABASE_URL });
          await client.connect();
          try {
            // Deletes every user created by the suite (their accounts and
            // transactions cascade with them) but keeps the seeded admin,
            // so repeated runs never accumulate data across spec files.
            await client.query("DELETE FROM users WHERE email <> 'admin@budgettracker.test'");
          } finally {
            await client.end();
          }
          return null;
        },
      });
      return config;
    },
  },

  env: {
    API_BASE_URL: "http://localhost:4000/api/",
  },
});
