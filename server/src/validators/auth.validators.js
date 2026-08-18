const Joi = require("joi");

// Unicode letters only, single internal space/hyphen/apostrophe as separators.
// Starts and ends with a letter, so leading/trailing whitespace and doubled
// separators are rejected by the pattern itself (not silently trimmed).
const NAME_PATTERN = /^\p{L}+(?:[ '-]\p{L}+)*$/u;

// At least one letter and one digit; length enforced separately.
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

const nameSchema = Joi.string()
  .min(2)
  .max(100)
  .pattern(NAME_PATTERN)
  .required()
  .messages({
    "string.pattern.base":
      "name must contain only letters, single spaces, hyphens or apostrophes, with no leading or trailing whitespace",
  });

const emailSchema = Joi.string()
  .max(254)
  .email({ tlds: { allow: false } })
  .lowercase()
  .required();

const passwordSchema = Joi.string()
  .min(8)
  .max(72)
  .pattern(PASSWORD_PATTERN)
  .required()
  .messages({
    "string.pattern.base": "password must contain at least one letter and one digit",
  });

const registerSchema = Joi.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema };
