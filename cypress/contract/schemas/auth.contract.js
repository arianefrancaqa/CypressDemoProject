const Joi = require("joi");

const registerResponseSchema = Joi.object({
  id: Joi.string().guid().required(),
  name: Joi.string().required(),
  email: Joi.string().required(),
  role: Joi.string().valid("user", "admin").required(),
  createdAt: Joi.string().isoDate().required(),
}).required();

const loginResponseSchema = Joi.object({
  token: Joi.string().required(),
  user: Joi.object({
    id: Joi.string().guid().required(),
    name: Joi.string().required(),
    email: Joi.string().required(),
    role: Joi.string().valid("user", "admin").required(),
  }).required(),
}).required();

const meResponseSchema = Joi.object({
  id: Joi.string().guid().required(),
  name: Joi.string().required(),
  email: Joi.string().required(),
  role: Joi.string().valid("user", "admin").required(),
  createdAt: Joi.string().isoDate().required(),
}).required();

export { registerResponseSchema, loginResponseSchema, meResponseSchema };
