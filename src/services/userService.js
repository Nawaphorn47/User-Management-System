'use strict';
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const SALT_ROUNDS = 10;

const getUsers = async ({ page = 1, limit = 10, search, role, sort = 'created_at', order = 'desc' }) => {
  const safeLimit = Math.min(parseInt(limit) || 10, 100);
  const safePage = Math.max(parseInt(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const allowedSorts = { createdAt: 'created_at', name: 'name', email: 'email' };
  const sortField = allowedSorts[sort] || 'created_at';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const where = {};
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }
  if (role && ['admin', 'user'].includes(role)) {
    where.role = role;
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    limit: safeLimit,
    offset,
    order: [[sortField, sortOrder]],
  });

  return {
    users: rows,
    pagination: {
      currentPage: safePage,
      totalPages: Math.ceil(count / safeLimit),
      totalItems: count,
      itemsPerPage: safeLimit,
    },
  };
};

const getUserById = async (id) => {
  const user = await User.findByPk(id);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return user;
};

const updateUser = async (id, data) => {
  const user = await getUserById(id);

  if (data.email) {
    const existing = await User.findOne({
      where: { email: data.email.toLowerCase(), id: { [Op.ne]: id } },
    });
    if (existing) {
      const error = new Error('Email already exists');
      error.statusCode = 409;
      throw error;
    }
  }

  if (data.password) {
    data.password = await bcrypt.hash(data.password, SALT_ROUNDS);
  }

  await user.update(data);
  return user;
};

const deleteUser = async (id) => {
  const user = await getUserById(id);
  await user.destroy();
};

const updateStatus = async (id, is_active) => {
  const user = await getUserById(id);
  await user.update({ is_active });
  return user;
};

module.exports = { getUsers, getUserById, updateUser, deleteUser, updateStatus };
