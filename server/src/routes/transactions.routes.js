const express = require("express");
const transactionsController = require("../controllers/transactions.controller");
const authenticate = require("../middleware/authenticate");
const { validateBody, validateParams } = require("../middleware/validate");
const {
  updateTransactionSchema,
  idParamSchema,
} = require("../validators/transactions.validators");

const router = express.Router();

router.use(authenticate);

router.get("/:id", validateParams(idParamSchema), transactionsController.getTransaction);
router.put(
  "/:id",
  validateParams(idParamSchema),
  validateBody(updateTransactionSchema),
  transactionsController.updateTransaction
);
router.delete("/:id", validateParams(idParamSchema), transactionsController.deleteTransaction);

module.exports = router;
