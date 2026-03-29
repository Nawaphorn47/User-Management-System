'use strict';
const jwt = require('jsonwebtoken');

// ✅ ใช้ secret แยกกันสำหรับ access และ refresh token
// เพิ่มใน .env:
//   JWT_SECRET=your-access-token-secret
//   JWT_REFRESH_SECRET=your-refresh-token-secret  ← ต้องเพิ่ม

const generateAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

const generateRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);

module.exports = { generateAccessToken, generateRefreshToken, verifyToken, verifyRefreshToken };
