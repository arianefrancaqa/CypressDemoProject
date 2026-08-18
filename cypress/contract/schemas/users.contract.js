const Joi = require("joi");

const userSummarySchema = Joi.object({
  id: Joi.string().guid().required(),
  name: Joi.string().required(),
  email: Joi.string().required(),
  role: Joi.string().valid("user", "admin").required(),
  createdAt: Joi.string().isoDate().required(),
}).required();

const userListResponseSchema = Joi.array().items(userSummarySchema).required();

export { userSummarySchema, userListResponseSchema };
