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

  reporter: "cypress-mochawesome-reporter",
  reporterOptions: {
    reportDir: "cypress/reports",
    charts: true,
    embeddedScreenshots: true,
    inlineAssets: true,
    reportPageTitle: "Cypress Demo Project - Test Report",
    reportFilename: "index",
    overwrite: false,
  },

  e2e: {
    baseUrl: "http://localhost:8080/",
    specPattern: "cypress/e2e/**/*.spec.js",
    supportFile: "cypress/support/e2e.js",
    setupNodeEvents(on, config) {
      require("cypress-mochawesome-reporter/plugin")(on);

      // Every DB task opens and closes its own short-lived connection. The
      // suite issues few enough queries that a pool isn't worth the extra
      // lifecycle to manage, and a leaked pool would keep the Node process
      // alive after the run finishes.
      async function withClient(callback) {
        const client = new Client({ connectionString: DATABASE_URL });
        await client.connect();
        try {
          return await callback(client);
        } finally {
          await client.end();
        }
      }

      on("task", {
        async resetDatabase() {
          await withClient((client) =>
            // Deletes every user created by the suite (their accounts and
            // transactions cascade with them) but keeps the seeded admin,
            // so repeated runs never accumulate data across spec files.
            client.query("DELETE FROM users WHERE email <> 'admin@budgettracker.test'")
          );
          return null;
        },

        // Read-only query used by the data-layer specs to assert on what is
        // actually stored, rather than on what the API says it stored.
        async dbQuery({ sql, params = [] }) {
          const result = await withClient((client) => client.query(sql, params));
          return result.rows;
        },

        // Attempts a write and reports whether the database accepted it,
        // ALWAYS rolling back so the suite's data is never mutated. This is
        // how constraint tests can try an invalid INSERT without cleanup.
        //
        // `probe` (optional) runs inside the same rolled-back transaction,
        // so a test can observe the intermediate state a write produced -
        // e.g. which rows a cascading DELETE removed - without persisting it.
        async dbAttemptWrite({ sql, params = [], probe }) {
          return withClient(async (client) => {
            await client.query("BEGIN");
            try {
              await client.query(sql, params);
              const probeRows = probe
                ? (await client.query(probe.sql, probe.params || [])).rows
                : null;
              return { accepted: true, error: null, probeRows };
            } catch (err) {
              return {
                accepted: false,
                error: {
                  // Postgres SQLSTATE: 23514 check_violation,
                  // 23505 unique_violation, 23503 foreign_key_violation.
                  code: err.code,
                  constraint: err.constraint || null,
                  message: err.message,
                },
                probeRows: null,
              };
            } finally {
              await client.query("ROLLBACK");
            }
          });
        },
      });
      return config;
    },
  },

  env: {
    API_BASE_URL: "http://localhost:4000/api/",
  },
});
