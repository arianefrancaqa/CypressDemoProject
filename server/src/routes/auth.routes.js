const express = require("express");
const authController = require("../controllers/auth.controller");
const authenticate = require("../middleware/authenticate");
const { validateBody } = require("../middleware/validate");
const { registerSchema, loginSchema } = require("../validators/auth.validators");
const { loginRateLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/register", validateBody(registerSchema), authController.register);
router.post("/login", loginRateLimiter, validateBody(loginSchema), authController.login);
router.get("/me", authenticate, authController.me);

module.exports = router;
