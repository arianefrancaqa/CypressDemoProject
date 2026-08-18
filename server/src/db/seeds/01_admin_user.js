const bcrypt = require("bcryptjs");

const ADMIN_EMAIL = "admin@budgettracker.test";
const ADMIN_PASSWORD = "AdminPass123";

exports.seed = async function (knex) {
  const existing = await knex("users").where({ email: ADMIN_EMAIL }).first();
  if (existing) return;

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await knex("users").insert({
    name: "Admin",
    email: ADMIN_EMAIL,
    password_hash: passwordHash,
    role: "admin",
  });
};
