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

// ฟังก์ชันสำหรับ User แก้ข้อมูลตัวเอง
const updateMe = async (req, res, next) => {
  try {
    const userId = req.user.id; // เอา ID มาจาก Token ที่ล็อกอิน ปลอดภัย 100%
    
    // ไอเดียที่ 2: กรองข้อมูล (Whitelist) เอาแค่นี้ ห้ามมี role เด็ดขาด
    const allowedUpdates = {
      name: req.body.name
      // ถ้าจะให้เปลี่ยนรหัสผ่านได้ ต้องเอาไป hash ก่อนเพิ่มใน object นี้
    };

    // ลบค่าที่เป็น undefined ออก (เผื่อเขาไม่ได้ส่ง name มา)
    Object.keys(allowedUpdates).forEach(key => 
      allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    const updatedUser = await userService.updateUser(userId, allowedUpdates);
    return res.status(200).json(createSuccessResponse({ user: updatedUser }, 'Profile updated'));
  } catch (err) {
    next(err);
  }
};

// ฟังก์ชันสำหรับ Admin (จะยอมให้ส่ง role เข้ามาอัปเดตคนอื่นได้)
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Admin แก้ได้เยอะกว่า (เช่น เปลี่ยน role ให้คนอื่นได้)
    const allowedUpdates = {
      name: req.body.name,
      role: req.body.role, // Admin ทำได้!
      status: req.body.status
    };
    
    Object.keys(allowedUpdates).forEach(key => 
      allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    const updatedUser = await userService.updateUser(id, allowedUpdates);
    return res.status(200).json(createSuccessResponse({ user: updatedUser }));
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

module.exports = { createUser, getUsers, getUserById, updateUser, deleteUser, updateStatus, updateMe };
