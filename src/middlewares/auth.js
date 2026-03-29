'use strict';
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createErrorResponse } = require('../utils/response');

// Set of blacklisted tokens (in production, use Redis)
const tokenBlacklist = new Set();

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(createErrorResponse('Access token required', null, 401));
    }

    const token = authHeader.split(' ')[1];
    // ... logic อื่นๆ

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json(
        createErrorResponse('User not found', null, 401)
      );
    }

    if (!user.is_active) {
      return res.status(403).json(
        createErrorResponse('Account is disabled', null, 403)
      );
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json(
        createErrorResponse('Token expired', null, 401)
      );
    }
    return res.status(401).json(
      createErrorResponse('Invalid token', null, 401)
    );
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json(
        createErrorResponse('Insufficient permissions', null, 403)
      );
    }
    next();
  };
};

const blacklistToken = (token) => {
  tokenBlacklist.add(token);
};

module.exports = { authenticate, authorize, blacklistToken };
