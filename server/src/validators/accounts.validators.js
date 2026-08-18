const Joi = require("joi");

// Letters, digits, spaces and hyphens only; starts/ends with an alphanumeric
// so leading/trailing whitespace is rejected, not trimmed. No angle brackets,
// so <script>/<b> style payloads are rejected outright.
const ACCOUNT_NAME_PATTERN = /^[\p{L}\p{N}]+(?:[ -][\p{L}\p{N}]+)*$/u;

const accountNameSchema = Joi.string()
  .min(2)
  .max(60)
  .pattern(ACCOUNT_NAME_PATTERN)
  .required()
  .messages({
    "string.pattern.base":
      "name must contain only letters, numbers, single spaces or hyphens, with no leading or trailing whitespace",
  });

const createAccountSchema = Joi.object({
  name: accountNameSchema,
});

const updateAccountSchema = Joi.object({
  name: accountNameSchema,
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

module.exports = { createAccountSchema, updateAccountSchema, idParamSchema };
