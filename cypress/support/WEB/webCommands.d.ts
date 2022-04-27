declare namespace Cypress {
  interface Chainable {
    /**
     * Register a new account using the FE
     * @param {string} name - name to register.
     * @param {string} email - email to register.
     * @param {string} password - password to register.
     * @param {string} message - message in the toast.
     */
     fillDataToRegisterAccountAndValidateMessage(name: string, email: string, password: string, message: string): void;
  }
}
