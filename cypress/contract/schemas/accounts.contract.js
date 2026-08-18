const Joi = require("joi");

const accountResponseSchema = Joi.object({
  id: Joi.string().guid().required(),
  userId: Joi.string().guid().required(),
  name: Joi.string().required(),
  createdAt: Joi.string().isoDate().required(),
  updatedAt: Joi.string().isoDate().required(),
}).required();

const accountListResponseSchema = Joi.array().items(accountResponseSchema).required();

export { accountResponseSchema, accountListResponseSchema };
