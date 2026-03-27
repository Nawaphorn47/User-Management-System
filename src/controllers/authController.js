'use strict';
const authService = require('../services/authService');
const { blacklistToken } = require('../middlewares/auth');
const { createSuccessResponse, createErrorResponse } = require('../utils/response');

const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    return res.status(201).json(createSuccessResponse({ user }, 'User registered successfully'));
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, user } = await authService.login(req.body);
    return res.status(200).json(
      createSuccessResponse({ accessToken, refreshToken, user }, 'Login successful')
    );
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    blacklistToken(req.token);
    await authService.logout(req.user.id);
    return res.status(200).json(createSuccessResponse(null, 'Logged out successfully'));
  } catch (err) {
    next(err);
  }
};

const me = (req, res) => {
  return res.status(200).json(createSuccessResponse({ user: req.user }));
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json(createErrorResponse('Refresh token required'));
    }
    const tokens = await authService.refreshAccessToken(refreshToken);
    return res.status(200).json(createSuccessResponse(tokens, 'Token refreshed'));
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, me, refresh };
