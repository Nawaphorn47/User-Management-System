'use strict';
const { body, validationResult } = require('express-validator');
const { createErrorResponse } = require('../utils/response');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return res.status(400).json(
      createErrorResponse('Validation failed', formatted, 400)
    );
  }
  next();
};

const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Must be at least 8 characters')
    .matches(/(?=.*[a-zA-Z])(?=.*[0-9])/).withMessage('Must contain at least 1 letter and 1 number'),
  body('role')
    .optional()
    .isIn(['admin', 'user']).withMessage('Role must be admin or user'),
  handleValidationErrors,
];

const loginValidation = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email format').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

const updateUserValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .optional()
    .isLength({ min: 8 }).withMessage('Must be at least 8 characters')
    .matches(/(?=.*[a-zA-Z])(?=.*[0-9])/).withMessage('Must contain at least 1 letter and 1 number'),
  body('role')
    .optional()
    .isIn(['admin', 'user']).withMessage('Role must be admin or user'),
  handleValidationErrors,
];

module.exports = { registerValidation, loginValidation, updateUserValidation };
