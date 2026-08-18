const Joi = require("joi");

const transactionResponseSchema = Joi.object({
  id: Joi.string().guid().required(),
  accountId: Joi.string().guid().required(),
  userId: Joi.string().guid().required(),
  description: Joi.string().required(),
  amount: Joi.number().required(),
  type: Joi.string().valid("income", "expense").required(),
  date: Joi.string().required(),
  createdAt: Joi.string().isoDate().required(),
  updatedAt: Joi.string().isoDate().required(),
}).required();

const transactionListResponseSchema = Joi.array().items(transactionResponseSchema).required();

const balanceResponseSchema = Joi.object({
  balance: Joi.number().required(),
}).required();

export { transactionResponseSchema, transactionListResponseSchema, balanceResponseSchema };
