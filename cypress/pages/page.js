const loginPage = {
    loginInput: '[data-test="email"]',
    passwordInput: '[data-test="passwd"]',
    loginButton: '.btn',
    registerTabButton: ':nth-child(2) > .nav-link'
}

const registerPage = {
    nameInput: '.jumbotron > :nth-child(1) > .form-control',
    emailInput: '.input-group > .form-control',
    passwordInput: ':nth-child(3) > .form-control',
    registerButton: '.btn'
}

export { loginPage, registerPage }