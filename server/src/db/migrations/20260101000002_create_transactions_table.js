exports.up = function (knex) {
  return knex.schema
    .createTable("transactions", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("account_id")
        .notNullable()
        .references("id")
        .inTable("accounts")
        .onDelete("CASCADE");
      table
        .uuid("user_id")
        .notNullable()
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table.string("description", 255).notNullable();
      table.decimal("amount", 12, 2).notNullable();
      table.string("type", 10).notNullable();
      table.date("date").notNullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.index("account_id");
      table.index("user_id");
    })
    .then(() =>
      knex.raw(`ALTER TABLE transactions ADD CONSTRAINT transactions_amount_check CHECK (amount > 0)`)
    )
    .then(() =>
      knex.raw(
        `ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense'))`
      )
    );
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("transactions");
};
