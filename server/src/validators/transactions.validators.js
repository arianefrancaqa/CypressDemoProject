const Joi = require("joi");

const MIN_DATE = "2000-01-01";

function tomorrowUtcString() {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  return tomorrow.toISOString().slice(0, 10);
}

const descriptionSchema = Joi.string()
  .min(1)
  .max(255)
  .pattern(/^[^<>]*$/)
  .required()
  .messages({
    "string.pattern.base": "description must not contain < or > characters",
  });

// Rejects amounts with more than 2 decimal places instead of silently
// rounding them, so the boundary is exact and assertable.
const amountSchema = Joi.number()
  .positive()
  .max(1000000)
  .custom((value, helpers) => {
    if (Number(value.toFixed(2)) !== value) {
      return helpers.error("number.precision");
    }
    return value;
  })
  .required()
  .messages({
    "number.positive": "amount must be greater than 0",
    "number.max": "amount must not exceed 1,000,000",
    "number.precision": "amount must have at most 2 decimal places",
  });

const typeSchema = Joi.string().valid("income", "expense").required();

// Plain YYYY-MM-DD string compare works because ISO date strings sort
// lexically the same as chronologically.
const dateSchema = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .custom((value, helpers) => {
    if (value < MIN_DATE) {
      return helpers.error("date.min");
    }
    if (value > tomorrowUtcString()) {
      return helpers.error("date.max");
    }
    return value;
  })
  .required()
  .messages({
    "string.pattern.base": "date must be in YYYY-MM-DD format",
    "date.min": `date must not be before ${MIN_DATE}`,
    "date.max": "date must not be more than one day in the future",
  });

const createTransactionSchema = Joi.object({
  description: descriptionSchema,
  amount: amountSchema,
  type: typeSchema,
  date: dateSchema,
});

const updateTransactionSchema = Joi.object({
  description: descriptionSchema.optional(),
  amount: amountSchema.optional(),
  type: typeSchema.optional(),
  date: dateSchema.optional(),
}).min(1);

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const accountIdParamSchema = Joi.object({
  accountId: Joi.string().uuid().required(),
});

module.exports = {
  createTransactionSchema,
  updateTransactionSchema,
  idParamSchema,
  accountIdParamSchema,
};
