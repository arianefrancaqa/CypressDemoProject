const navbar = {
  dashboardLink: '[data-testid="nav-dashboard-link"]',
  adminLink: '[data-testid="nav-admin-link"]',
  userName: '[data-testid="nav-user-name"]',
  logoutButton: '[data-testid="nav-logout-button"]',
};

const loginPage = {
  emailInput: '[data-testid="login-email-input"]',
  passwordInput: '[data-testid="login-password-input"]',
  submitButton: '[data-testid="login-submit-button"]',
  error: '[data-testid="login-error"]',
};

const registerPage = {
  nameInput: '[data-testid="register-name-input"]',
  emailInput: '[data-testid="register-email-input"]',
  passwordInput: '[data-testid="register-password-input"]',
  submitButton: '[data-testid="register-submit-button"]',
  success: '[data-testid="register-success"]',
  error: '[data-testid="register-error"]',
  fieldError: (field) => `[data-testid="register-field-error-${field}"]`,
};

const dashboardPage = {
  accountNameInput: '[data-testid="account-name-input"]',
  accountFormSubmit: '[data-testid="account-form-submit"]',
  accountList: '[data-testid="account-list"]',
  accountItem: (id) => `[data-testid="account-item-${id}"]`,
  accountLink: (id) => `[data-testid="account-link-${id}"]`,
  error: '[data-testid="dashboard-error"]',
  noAccountsMessage: '[data-testid="no-accounts-message"]',
};

const accountDetailPage = {
  name: '[data-testid="account-detail-name"]',
  balance: '[data-testid="account-balance"]',
  deleteAccountButton: '[data-testid="delete-account-button"]',
  error: '[data-testid="account-detail-error"]',
  fieldError: (field) => `[data-testid="transaction-field-error-${field}"]`,
  descriptionInput: '[data-testid="transaction-description-input"]',
  amountInput: '[data-testid="transaction-amount-input"]',
  typeSelect: '[data-testid="transaction-type-select"]',
  dateInput: '[data-testid="transaction-date-input"]',
  transactionFormSubmit: '[data-testid="transaction-form-submit"]',
  transactionList: '[data-testid="transaction-list"]',
  transactionItem: (id) => `[data-testid="transaction-item-${id}"]`,
  deleteTransactionButton: (id) => `[data-testid="delete-transaction-${id}"]`,
  noTransactionsMessage: '[data-testid="no-transactions-message"]',
};

const adminUsersPage = {
  userList: '[data-testid="user-list"]',
  userItem: (id) => `[data-testid="user-item-${id}"]`,
  error: '[data-testid="admin-users-error"]',
};

export {
  navbar,
  loginPage,
  registerPage,
  dashboardPage,
  accountDetailPage,
  adminUsersPage,
};
