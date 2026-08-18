const db = require("../config/db");

function findByEmail(email) {
  return db("users").where({ email }).first();
}

function findById(id) {
  return db("users").where({ id }).first();
}

async function create({ name, email, passwordHash }) {
  const [user] = await db("users")
    .insert({ name, email, password_hash: passwordHash })
    .returning(["id", "name", "email", "role", "created_at"]);
  return user;
}

function listAll() {
  return db("users").select("id", "name", "email", "role", "created_at").orderBy("created_at", "asc");
}

module.exports = { findByEmail, findById, create, listAll };
