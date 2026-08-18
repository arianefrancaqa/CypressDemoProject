const express = require("express");
const usersController = require("../controllers/users.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

const router = express.Router();

router.get("/", authenticate, authorize("admin"), usersController.listUsers);

module.exports = router;
