const { verifyToken } = require("../utils/jwt");
const ApiError = require("../utils/ApiError");

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(ApiError.unauthorized());
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(ApiError.unauthorized());
  }
}

module.exports = authenticate;
