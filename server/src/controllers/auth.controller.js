const usersModel = require("../models/users.model");
const { hashPassword, comparePassword } = require("../utils/password");
const { signToken } = require("../utils/jwt");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await usersModel.findByEmail(email);
  if (existing) {
    throw ApiError.conflict("Email already registered");
  }

  const passwordHash = await hashPassword(password);
  const user = await usersModel.create({ name, email, passwordHash });

  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await usersModel.findByEmail(email);
  const passwordMatches = user ? await comparePassword(password, user.password_hash) : false;

  if (!user || !passwordMatches) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const token = signToken(user);
  res.status(200).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await usersModel.findById(req.user.id);
  if (!user) {
    throw ApiError.unauthorized();
  }
  res.status(200).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
  });
});

module.exports = { register, login, me };
