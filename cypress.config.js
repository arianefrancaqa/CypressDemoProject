const { defineConfig } = require("cypress");

module.exports = defineConfig({
  projectId: "xkdu4i",
  video: false,

  e2e: {
    baseUrl: "https://barrigareact.wcaquino.me/",
    specPattern: "cypress/e2e/**/*.spec.js",
    supportFile: "cypress/support/e2e.js",
    setupNodeEvents(on, config) {
      return config;
    },
  },

  env: {
    API_BASE_URL: "https://barrigarest.wcaquino.me/",
  },
});
