const rateLimit = require("express-rate-limit");

// Configurable so the Docker/CI test stack can raise the ceiling well above
// what a full automated test run needs (every spec authenticates from the
// same runner IP), while the default stays at a real brute-force-protection
// value for anyone running the API outside that stack.
const windowMs = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const limit = Number(process.env.LOGIN_RATE_LIMIT_MAX) || 5;

const loginRateLimiter = rateLimit({
  windowMs,
  limit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later" },
});

module.exports = { loginRateLimiter };
