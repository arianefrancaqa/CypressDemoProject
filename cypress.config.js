const { defineConfig } = require("cypress");

module.exports = defineConfig({
  projectId: "xkdu4i",
  video: false,

  e2e: {
    baseUrl: "http://localhost:8080/",
    specPattern: "cypress/e2e/**/*.spec.js",
    supportFile: "cypress/support/e2e.js",
    setupNodeEvents(on, config) {
      return config;
    },
  },

  env: {
    API_BASE_URL: "http://localhost:4000/api/",
  },
});
