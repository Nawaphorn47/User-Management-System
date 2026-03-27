'use strict';
const router = require('express').Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/auth');
const { updateUserValidation } = require('../middlewares/validate');

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only, with pagination)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name or email
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [admin, user] }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [createdAt, name, email], default: createdAt }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200: { description: Paginated user list }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get('/', authenticate, authorize('admin'), userController.getUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin or own account)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: User data }
 *       403: { description: Forbidden }
 *       404: { description: User not found }
 */
router.get('/:id', authenticate, userController.getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user (Admin or own account)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: [admin, user] }
 *     responses:
 *       200: { description: User updated }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
router.put('/:id', authenticate, updateUserValidation, userController.updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204: { description: Deleted }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
router.delete('/:id', authenticate, authorize('admin'), userController.deleteUser);

/**
 * @swagger
 * /api/users/{id}/status:
 *   patch:
 *     summary: Enable/disable user account (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [is_active]
 *             properties:
 *               is_active: { type: boolean }
 *     responses:
 *       200: { description: Status updated }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
router.patch('/:id/status', authenticate, authorize('admin'), userController.updateStatus);

module.exports = router;
