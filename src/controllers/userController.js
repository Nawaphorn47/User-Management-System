'use strict';
const userService = require('../services/userService');
const { createSuccessResponse, createPaginatedResponse, createErrorResponse } = require('../utils/response');

const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    return res.status(201).json(createSuccessResponse({ user }, 'User created successfully'));
  } catch (err) {
    next(err);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const { page, limit, search, role, sort, order } = req.query;
    const result = await userService.getUsers({ page, limit, search, role, sort, order });
    return res.status(200).json(createPaginatedResponse(result.users, result.pagination));
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id);
    if (req.user.role !== 'admin' && req.user.id !== targetId) {
      // ✅ ใช้ createErrorResponse ให้สม่ำเสมอ
      return res.status(403).json(createErrorResponse('Forbidden', null, 403));
    }
    const user = await userService.getUserById(targetId);
    return res.status(200).json(createSuccessResponse({ user }));
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id);
    if (req.user.role !== 'admin' && req.user.id !== targetId) {
      return res.status(403).json(createErrorResponse('Forbidden', null, 403));
    }
    // Only admin can change role
    if (req.user.role !== 'admin') delete req.body.role;

    const user = await userService.updateUser(targetId, req.body);
    return res.status(200).json(createSuccessResponse({ user }, 'User updated'));
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(parseInt(req.params.id));
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json(createErrorResponse('is_active must be boolean', null, 400));
    }
    const user = await userService.updateStatus(parseInt(req.params.id), is_active);
    return res.status(200).json(createSuccessResponse({ user }, 'Status updated'));
  } catch (err) {
    next(err);
  }
};

module.exports = { createUser, getUsers, getUserById, updateUser, deleteUser, updateStatus };
