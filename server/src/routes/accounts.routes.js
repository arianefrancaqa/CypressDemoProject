const express = require("express");
const accountsController = require("../controllers/accounts.controller");
const transactionsController = require("../controllers/transactions.controller");
const authenticate = require("../middleware/authenticate");
const { validateBody, validateParams } = require("../middleware/validate");
const {
  createAccountSchema,
  updateAccountSchema,
  idParamSchema,
} = require("../validators/accounts.validators");
const {
  createTransactionSchema,
  accountIdParamSchema,
} = require("../validators/transactions.validators");

const router = express.Router();

router.use(authenticate);

router.get("/", accountsController.listAccounts);
router.post("/", validateBody(createAccountSchema), accountsController.createAccount);
router.get("/:id", validateParams(idParamSchema), accountsController.getAccount);
router.put(
  "/:id",
  validateParams(idParamSchema),
  validateBody(updateAccountSchema),
  accountsController.updateAccount
);
router.delete("/:id", validateParams(idParamSchema), accountsController.deleteAccount);

router.get(
  "/:accountId/transactions",
  validateParams(accountIdParamSchema),
  transactionsController.listTransactions
);
router.post(
  "/:accountId/transactions",
  validateParams(accountIdParamSchema),
  validateBody(createTransactionSchema),
  transactionsController.createTransaction
);
router.get(
  "/:accountId/balance",
  validateParams(accountIdParamSchema),
  transactionsController.getBalance
);

module.exports = router;
