require("dotenv").config();
const Joi = require("joi");

const schema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "test", "production")
    .default("development"),
  PORT: Joi.number().integer().positive().default(4000),
  DATABASE_URL: Joi.string().uri({ scheme: ["postgres", "postgresql"] }).required(),
  JWT_SECRET: Joi.string().min(16).required(),
  CORS_ORIGIN: Joi.string().uri().required(),
}).unknown(true);

const { value, error } = schema.validate(process.env);

if (error) {
  throw new Error(`Invalid environment configuration: ${error.message}`);
}

module.exports = {
  nodeEnv: value.NODE_ENV,
  port: value.PORT,
  databaseUrl: value.DATABASE_URL,
  jwtSecret: value.JWT_SECRET,
  corsOrigin: value.CORS_ORIGIN,
};
