const db = require("../config/db");

function findById(id) {
  return db("accounts").where({ id }).first();
}

function findByUserAndName(userId, name) {
  return db("accounts")
    .where({ user_id: userId })
    .whereRaw("lower(name) = lower(?)", [name])
    .first();
}

function listByUser(userId) {
  return db("accounts").where({ user_id: userId }).orderBy("created_at", "asc");
}

async function create({ userId, name }) {
  const [account] = await db("accounts")
    .insert({ user_id: userId, name })
    .returning(["id", "user_id", "name", "created_at", "updated_at"]);
  return account;
}

async function update(id, { name }) {
  const [account] = await db("accounts")
    .where({ id })
    .update({ name, updated_at: db.fn.now() })
    .returning(["id", "user_id", "name", "created_at", "updated_at"]);
  return account;
}

function remove(id) {
  return db("accounts").where({ id }).del();
}

async function hasTransactions(accountId) {
  const row = await db("transactions").where({ account_id: accountId }).first("id");
  return Boolean(row);
}

module.exports = {
  findById,
  findByUserAndName,
  listByUser,
  create,
  update,
  remove,
  hasTransactions,
};
