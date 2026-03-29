# User Management System API

RESTful API สำหรับจัดการผู้ใช้งาน พัฒนาด้วย **Node.js + Express.js + PostgreSQL**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express.js 4 |
| Database | PostgreSQL 16 |
| ORM | Sequelize 6 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Docs | Swagger (swagger-jsdoc + swagger-ui-express) |
| Testing | Jest + Supertest |
| Container | Docker + Docker Compose |

**เหตุผลที่เลือก:** Node.js + Express.js เหมาะกับ I/O-heavy workload เช่น API ประกอบกับ ecosystem ขนาดใหญ่ PostgreSQL เลือกเพราะรองรับ JSONB, Full-text search และเป็น Production-grade database

---

## 1. ติดตั้งและรัน (Docker Compose)

```bash
# 1. Clone repository
git clone https://github.com/Nawaphorn47/User-Management-System.git
cd User-Management-System

# 2. สร้าง .env จาก .env.example
cp .env.example .env
# แก้ไขค่า DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET ใน .env

# 3. รัน (build + start ทุก services)
docker compose up --build

# API พร้อมใช้งานที่  http://localhost:3000
# Swagger UI ที่       http://localhost:3000/api-docs
# Adminer (DB GUI) ที่  http://localhost:8080
```

---

## 2. Environment Variables

คัดลอกจาก `.env.example` และแก้ไขค่าต่อไปนี้:

```bash
# App
PORT=3000
NODE_ENV=development

# Database
DB_HOST=db
DB_PORT=5432
DB_NAME=userdb
DB_USER=appuser
DB_PASSWORD=changeme          # ← เปลี่ยนใน Production

# JWT
JWT_SECRET=your-super-secret          # ← เปลี่ยนเป็นค่าที่ยาวและสุ่ม
JWT_REFRESH_SECRET=your-refresh-secret # ← แยก secret สำหรับ refresh token
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000    # 1 นาที
RATE_LIMIT_MAX=5              # สูงสุด 5 ครั้ง/นาที สำหรับ /api/auth/login

# CORS
CORS_ORIGIN=http://localhost:3000
```

---

## 3. Database Migration & Seed

Migration จะถูกรันอัตโนมัติผ่าน sequelize-cli ตอน start:

```bash
# รัน Migration (สร้างตาราง)
docker compose exec app npx sequelize-cli db:migrate

# รัน Seed (สร้าง Admin เริ่มต้น)
docker compose exec app npx sequelize-cli db:seed:all

# ย้อน Migration (ถ้าต้องการ)
docker compose exec app npx sequelize-cli db:migrate:undo
```

---

## 4. รัน Test Suite

```bash
# รันใน Docker
docker compose exec app npm test

# รันใน local (ต้องมี DB พร้อม)
npm test
```

Test ครอบคลุมอย่างน้อย 15 test cases ใน `tests/`

---

## 5. API Documentation

Swagger UI: **http://localhost:3000/api-docs**

ทุก Endpoint ที่ต้อง Auth ใช้ **Bearer Token** — กด `Authorize` แล้วใส่ `accessToken` ที่ได้จาก `POST /api/auth/login`

---

## 6. Test Accounts (จาก Seed Data)

| Role | Email | Password |
|---|---|---|
| Admin | admin@system.com | admin1234 |

> **หมายเหตุ:** User ทั่วไปสมัครได้ผ่าน `POST /api/auth/register` — role จะเป็น `user` เสมอ ไม่สามารถกำหนด role ตอนสมัครได้

---

## 7. API Endpoints สรุป

### Auth

| Method | Endpoint | Auth | คำอธิบาย |
|---|---|---|---|
| POST | /api/auth/register | Public | สมัครสมาชิก (role = user เสมอ) |
| POST | /api/auth/login | Public | เข้าสู่ระบบ (Rate limit 5/นาที) |
| POST | /api/auth/logout | Required | ออกจากระบบ + Blacklist token |
| GET | /api/auth/me | Required | ดูข้อมูลตัวเอง |
| POST | /api/auth/refresh | Public | ต่ออายุ Access Token |

### Users

| Method | Endpoint | Auth | คำอธิบาย |
|---|---|---|---|
| POST | /api/users | Admin | สร้าง User ใหม่ |
| GET | /api/users | Admin | รายการผู้ใช้ (Pagination + Filter) |
| GET | /api/users/:id | Admin/Owner | ดูข้อมูลผู้ใช้ |
| PUT | /api/users/me | Login | แก้ไขข้อมูลตัวเอง (name เท่านั้น) |
| PUT | /api/users/:id | Admin | แก้ไขข้อมูลผู้ใช้ (name, role) |
| DELETE | /api/users/:id | Admin | ลบผู้ใช้ |
| PATCH | /api/users/:id/status | Admin | เปิด/ปิด account |

### Query Parameters สำหรับ GET /api/users

```
?page=1&limit=10&search=alice&role=user&sort=createdAt&order=desc
```

| Parameter | Default | หมายเหตุ |
|---|---|---|
| page | 1 | หน้าที่ต้องการ |
| limit | 10 | จำนวนต่อหน้า (max 100) |
| search | - | ค้นหาจาก name หรือ email |
| role | - | กรอง admin / user |
| sort | createdAt | createdAt / name / email |
| order | desc | asc / desc |

---

## 8. Security Features

| Feature | รายละเอียด |
|---|---|
| bcrypt | salt rounds = 10 สำหรับ password hashing |
| JWT | Access Token 15 นาที / Refresh Token 7 วัน |
| JWT Secret | แยก secret สำหรับ access และ refresh token |
| Token Blacklist | Blacklist token ใน memory เมื่อ logout |
| Rate Limiting | `/api/auth/login` สูงสุด 5 ครั้ง/นาที |
| Helmet.js | HTTP Security Headers |
| RBAC | admin จัดการทุกคนได้ / user แก้ได้เฉพาะตัวเอง |
| Privilege Escalation | ล็อก role = 'user' ตอน register เสมอ |
| Mass Assignment | Whitelist field ใน controller ทุกจุด |
| Sensitive Fields | ไม่ส่ง password / refresh_token กลับใน Response |

---

## 9. โครงสร้าง Project

```
User-Management-System/
├── src/
│   ├── config/
│   │   ├── database.js       # Sequelize connection
│   │   ├── database.json     # sequelize-cli config
│   │   └── swagger.js        # Swagger spec
│   ├── controllers/
│   │   ├── authController.js
│   │   └── userController.js
│   ├── middlewares/
│   │   ├── auth.js           # authenticate + authorize
│   │   ├── errorHandler.js
│   │   └── validate.js
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── users.js
│   ├── services/
│   │   ├── authService.js
│   │   └── userService.js
│   ├── utils/
│   │   ├── jwt.js
│   │   └── response.js
│   └── app.js
├── migrations/
│   └── XXXXXXXXXXXXXX-create-users-table.js
├── seeders/
│   └── XXXXXXXXXXXXXX-god-admin.js
├── tests/
│   └── auth.test.js
├── .env.example
├── .sequelizerc
├── docker-compose.yml
├── Dockerfile
└── README.md
```
