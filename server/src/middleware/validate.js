const ApiError = require("../utils/ApiError");

function formatDetails(joiError) {
  return joiError.details.map((detail) => ({
    field: detail.path.join("."),
    message: detail.message.replace(/"/g, ""),
  }));
}

function validateBody(schema) {
  return function (req, res, next) {
    const { value, error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return next(ApiError.badRequest("Validation failed", formatDetails(error)));
    }
    req.body = value;
    next();
  };
}

function validateParams(schema) {
  return function (req, res, next) {
    const { value, error } = schema.validate(req.params, { abortEarly: false });
    if (error) {
      return next(ApiError.badRequest("Validation failed", formatDetails(error)));
    }
    req.params = value;
    next();
  };
}

module.exports = { validateBody, validateParams };
