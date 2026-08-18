const ApiError = require("../utils/ApiError");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    const body = { error: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  // Anything else (DB errors, bugs, etc.) is logged server-side but never
  // leaked to the client - the old app this replaces returned raw Postgres
  // error bodies as 500s, which is exactly what this guards against.
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: "Route not found" });
}

module.exports = { errorHandler, notFoundHandler };
