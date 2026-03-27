'use strict';
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt');

const SALT_ROUNDS = 10;

const register = async ({ name, email, password, role }) => {
  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) {
    const error = new Error('Email already exists');
    error.statusCode = 409;
    throw error;
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, password: hashed, role: role || 'user' });
  return user;
};

const login = async ({ email, password }) => {
  const user = await User.findOne({
    where: { email: email.toLowerCase() },
    attributes: { include: ['password', 'refresh_token'] },
  });

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  if (!user.is_active) {
    const error = new Error('Account is disabled');
    error.statusCode = 403;
    throw error;
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const payload = { id: user.id, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await user.update({ refresh_token: refreshToken });

  return { accessToken, refreshToken, user };
};

const refreshAccessToken = async (refreshToken) => {
  let decoded;
  try {
    decoded = verifyToken(refreshToken);
  } catch {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findOne({
    where: { id: decoded.id },
    attributes: { include: ['refresh_token'] },
  });

  if (!user || user.refresh_token !== refreshToken) {
    const error = new Error('Refresh token revoked');
    error.statusCode = 401;
    throw error;
  }

  const payload = { id: user.id, role: user.role };
  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  await user.update({ refresh_token: newRefreshToken });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

const logout = async (userId) => {
  await User.update({ refresh_token: null }, { where: { id: userId } });
};

module.exports = { register, login, refreshAccessToken, logout };
