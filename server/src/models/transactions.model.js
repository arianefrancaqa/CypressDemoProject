const db = require("../config/db");

function findById(id) {
  return db("transactions").where({ id }).first();
}

function listByAccount(accountId) {
  return db("transactions").where({ account_id: accountId }).orderBy("date", "desc");
}

async function create({ accountId, userId, description, amount, type, date }) {
  const [transaction] = await db("transactions")
    .insert({ account_id: accountId, user_id: userId, description, amount, type, date })
    .returning("*");
  return transaction;
}

async function update(id, fields) {
  const [transaction] = await db("transactions")
    .where({ id })
    .update({ ...fields, updated_at: db.fn.now() })
    .returning("*");
  return transaction;
}

function remove(id) {
  return db("transactions").where({ id }).del();
}

async function sumByAccount(accountId) {
  const rows = await db("transactions")
    .where({ account_id: accountId })
    .select("type")
    .sum({ total: "amount" })
    .groupBy("type");

  let balance = 0;
  for (const row of rows) {
    const total = Number(row.total);
    balance += row.type === "income" ? total : -total;
  }
  return Number(balance.toFixed(2));
}

module.exports = { findById, listByAccount, create, update, remove, sumByAccount };
