const accountsModel = require("../models/accounts.model");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { assertOwnerOrAdmin } = require("../utils/ownership");

function serialize(account) {
  return {
    id: account.id,
    userId: account.user_id,
    name: account.name,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
  };
}

const listAccounts = asyncHandler(async (req, res) => {
  const accounts = await accountsModel.listByUser(req.user.id);
  res.status(200).json(accounts.map(serialize));
});

const createAccount = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const existing = await accountsModel.findByUserAndName(req.user.id, name);
  if (existing) {
    throw ApiError.conflict("An account with this name already exists");
  }

  const account = await accountsModel.create({ userId: req.user.id, name });
  res.status(201).json(serialize(account));
});

const getAccount = asyncHandler(async (req, res) => {
  const account = await accountsModel.findById(req.params.id);
  assertOwnerOrAdmin(account, req.user, "Account not found");
  res.status(200).json(serialize(account));
});

const updateAccount = asyncHandler(async (req, res) => {
  const account = await accountsModel.findById(req.params.id);
  assertOwnerOrAdmin(account, req.user, "Account not found");

  const { name } = req.body;
  const duplicate = await accountsModel.findByUserAndName(account.user_id, name);
  if (duplicate && duplicate.id !== account.id) {
    throw ApiError.conflict("An account with this name already exists");
  }

  const updated = await accountsModel.update(account.id, { name });
  res.status(200).json(serialize(updated));
});

const deleteAccount = asyncHandler(async (req, res) => {
  const account = await accountsModel.findById(req.params.id);
  assertOwnerOrAdmin(account, req.user, "Account not found");

  const hasTransactions = await accountsModel.hasTransactions(account.id);
  if (hasTransactions) {
    throw ApiError.conflict("Cannot delete an account that has transactions");
  }

  await accountsModel.remove(account.id);
  res.status(204).send();
});

module.exports = { listAccounts, createAccount, getAccount, updateAccount, deleteAccount };
