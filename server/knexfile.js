require("dotenv").config();

const base = {
  client: "pg",
  connection: process.env.DATABASE_URL,
  migrations: {
    directory: "./src/db/migrations",
    tableName: "knex_migrations",
  },
  seeds: {
    directory: "./src/db/seeds",
  },
};

module.exports = {
  development: base,
  test: base,
  production: base,
};
