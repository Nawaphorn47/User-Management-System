'use strict';
const { createErrorResponse } = require('../utils/response');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';

  // Sequelize unique constraint
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json(
      createErrorResponse('Email already exists', null, 409)
    );
  }

  // Sequelize validation
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map((e) => ({ field: e.path, message: e.message }));
    return res.status(400).json(
      createErrorResponse('Validation failed', errors, 400)
    );
  }

  const status = err.statusCode || err.status || 500;
  const message = isProd && status === 500 ? 'Internal server error' : err.message;

  return res.status(status).json(createErrorResponse(message, null, status));
};

module.exports = errorHandler;
