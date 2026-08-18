const accountsModel = require("../models/accounts.model");
const transactionsModel = require("../models/transactions.model");
const asyncHandler = require("../utils/asyncHandler");
const { assertOwnerOrAdmin } = require("../utils/ownership");

function serialize(transaction) {
  return {
    id: transaction.id,
    accountId: transaction.account_id,
    userId: transaction.user_id,
    description: transaction.description,
    amount: Number(transaction.amount),
    type: transaction.type,
    date: transaction.date,
    createdAt: transaction.created_at,
    updatedAt: transaction.updated_at,
  };
}

const listTransactions = asyncHandler(async (req, res) => {
  const account = await accountsModel.findById(req.params.accountId);
  assertOwnerOrAdmin(account, req.user, "Account not found");

  const transactions = await transactionsModel.listByAccount(account.id);
  res.status(200).json(transactions.map(serialize));
});

const createTransaction = asyncHandler(async (req, res) => {
  const account = await accountsModel.findById(req.params.accountId);
  assertOwnerOrAdmin(account, req.user, "Account not found");

  const { description, amount, type, date } = req.body;
  const transaction = await transactionsModel.create({
    accountId: account.id,
    userId: account.user_id,
    description,
    amount,
    type,
    date,
  });
  res.status(201).json(serialize(transaction));
});

const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await transactionsModel.findById(req.params.id);
  assertOwnerOrAdmin(transaction, req.user, "Transaction not found");
  res.status(200).json(serialize(transaction));
});

const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await transactionsModel.findById(req.params.id);
  assertOwnerOrAdmin(transaction, req.user, "Transaction not found");

  const updated = await transactionsModel.update(transaction.id, req.body);
  res.status(200).json(serialize(updated));
});

const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await transactionsModel.findById(req.params.id);
  assertOwnerOrAdmin(transaction, req.user, "Transaction not found");

  await transactionsModel.remove(transaction.id);
  res.status(204).send();
});

const getBalance = asyncHandler(async (req, res) => {
  const account = await accountsModel.findById(req.params.accountId);
  assertOwnerOrAdmin(account, req.user, "Account not found");

  const balance = await transactionsModel.sumByAccount(account.id);
  res.status(200).json({ balance });
});

module.exports = {
  listTransactions,
  createTransaction,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getBalance,
};
