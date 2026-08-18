const Joi = require("joi");

// Every non-2xx response from the API uses this same envelope. `details` is
// only present on 400 validation failures.
const errorResponseSchema = Joi.object({
  error: Joi.string().required(),
  details: Joi.array()
    .items(
      Joi.object({
        field: Joi.string().required(),
        message: Joi.string().required(),
      })
    )
    .optional(),
}).required();

export { errorResponseSchema };
