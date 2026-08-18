exports.up = function (knex) {
  return knex.schema
    .createTable("accounts", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("user_id")
        .notNullable()
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table.string("name", 60).notNullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    })
    .then(() =>
      knex.raw(
        `CREATE UNIQUE INDEX accounts_user_id_lower_name_unique ON accounts (user_id, lower(name))`
      )
    );
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("accounts");
};
