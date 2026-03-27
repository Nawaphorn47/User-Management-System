'use strict';
const router = require('express').Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { registerValidation, loginValidation } = require('../middlewares/validate');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 5,
  message: { success: false, message: 'Too many login attempts. Try again later.', timestamp: new Date().toISOString() },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: Alice }
 *               email: { type: string, example: alice@example.com }
 *               password: { type: string, example: password1 }
 *               role: { type: string, enum: [admin, user] }
 *     responses:
 *       201: { description: User registered }
 *       400: { description: Validation failed }
 *       409: { description: Email already exists }
 */
router.post('/register', registerValidation, authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and receive JWT tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful, returns accessToken and refreshToken }
 *       401: { description: Invalid credentials }
 */
router.post('/login', loginLimiter, loginValidation, authController.login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout and blacklist token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Logged out }
 *       401: { description: Unauthorized }
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user info
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Unauthorized }
 */
router.get('/me', authenticate, authController.me);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: New tokens returned }
 *       401: { description: Invalid refresh token }
 */
router.post('/refresh', authController.refresh);

module.exports = router;
