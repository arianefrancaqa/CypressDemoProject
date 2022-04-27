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
  }
}
