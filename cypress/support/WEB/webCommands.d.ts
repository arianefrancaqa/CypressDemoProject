import { param } from "cypress/types/jquery";

declare namespace Cypress {
  interface Chainable {
    /**
     * Creates an Account using API
     * @param {string} name - name to register.
     * @param {string} email - email to register.
     * @param {string} password - password to register.
     * @param {string} message - message in the toast.
     */
     fillDataToRegisterAccountAndValidateMessage(name: string, email: string, password: string, message: string);
  }
}
