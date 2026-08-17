declare namespace Cypress {
  interface Chainable {
    /**
     * Creates an Account using API
     */
    createAccount(): void;

    /**
     * Creates an Account using API
     * @param {string} name - name to register.
     * @param {string} email - email to register.
     * @param {string} password - password to register.
     */
    createAccountPassingValues(
      name: string,
      email: string,
      password: string
    ): void;

    /**
     * Logs in via the API (POST /signin). Does not assert the response,
     * since it is used for both success and failure test cases.
     * @param {string} email - email to log in with.
     * @param {string} password - password to log in with.
     */
    login(email: string, password: string): Chainable<Cypress.Response<any>>;
  }
}
