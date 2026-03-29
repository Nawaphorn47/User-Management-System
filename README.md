# User Management System API

RESTful API สำหรับจัดการผู้ใช้งาน พัฒนาด้วย **Node.js + Express.js + PostgreSQL**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 |
| Framework | Express.js 4 |
| Database | PostgreSQL 16 |
| ORM | Sequelize 6 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Docs | Swagger (swagger-jsdoc + swagger-ui-express) |
| Testing | Jest + Supertest |
| Container | Docker + Docker Compose |

**เหตุผลที่เลือก:** Node.js + Express.js เหมาะกับ I/O-heavy workload เช่น API, ประกอบกับ ecosystem ขนาดใหญ่ PostgreSQL เลือกเพราะรองรับ JSONB, Full-text search และเป็น Production-grade database

---

## 1. ติดตั้งและรัน (Docker Compose)

```bash
# 1. Clone repository
git clone <repo-url>
cd user-management

# 2. สร้าง .env จาก .env.example
cp .env.example .env
# แก้ไขค่า DB_PASSWORD, JWT_SECRET ใน .env

# 3. รัน (build + start ทุก services)
docker compose up --build

4. จัดการโครงสร้างฐานข้อมูล (Database Setup)
เมื่อ Container รันแล้ว ให้รันคำสั่งเหล่านี้เพื่อสร้างตารางและข้อมูลตั้งต้น:

สร้างตาราง (Migration):

Bash
docker exec -it user-management-app-1 npx sequelize-cli db:migrate
สร้างข้อมูล Admin คนแรก (Seeding):

Bash
docker exec -it user-management-app-1 npx sequelize-cli db:seed:all

# API พร้อมใช้งานที่ http://localhost:3000
# Swagger UI ที่       http://localhost:3000/api-docs
# Adminer (DB GUI) ที่  http://localhost:8080
```

---

## 2. Environment Variables

คัดลอกจาก `.env.example` และแก้ไขค่าต่อไปนี้:

```env
PORT=3000
NODE_ENV=development

DB_HOST=db
DB_PORT=5432
DB_NAME=userdb
DB_USER=appuser
DB_PASSWORD=changeme          # ← เปลี่ยนใน Production

JWT_SECRET=your-super-secret  # ← เปลี่ยนเป็นค่าที่ยาวและสุ่ม
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

RATE_LIMIT_WINDOW_MS=60000    # 1 นาที
RATE_LIMIT_MAX=5              # สูงสุด 5 ครั้ง/นาที สำหรับ /api/auth/login

CORS_ORIGIN=http://localhost:3000
```

---

## 3. Database Migration & Seed

```bash
# รัน Migration (สร้างตาราง)
npm run migrate
# หรือ: docker compose exec app npm run migrate

# รัน Seed (สร้าง Admin + User เริ่มต้น)
npm run seed
# หรือ: docker compose exec app npm run seed
```

> Migration จะถูกรันอัตโนมัติเมื่อ app เริ่มทำงาน (`sequelize.sync`)

---

## 4. รัน Test Suite

```bash
# รันใน local (ต้องมี DB พร้อม)
npm test

# รันใน Docker
docker compose exec app npm test
```

Test ครอบคลุมอย่างน้อย 15 test cases ใน `tests/auth.test.js`

---

## 5. API Documentation

Swagger UI: **http://localhost:3000/api-docs**

ทุก Endpoint ที่ต้อง Auth ใช้ **Bearer Token** — กด `Authorize` แล้วใส่ `accessToken` ที่ได้จาก `/api/auth/login`

---

## 6. Test Accounts (จาก Seed Data)

| Role  | Email                | Password   |
|-------|----------------------|------------|
| Admin | admin@system.com     | admin1234  |

---

## 7. API Endpoints สรุป

### Auth
| Method | Endpoint              | Auth     | คำอธิบาย |
|--------|-----------------------|----------|---------|
| POST   | /api/auth/register    | Public   | สมัครสมาชิก |
| POST   | /api/auth/login       | Public   | เข้าสู่ระบบ (Rate limit 5/นาที) |
| POST   | /api/auth/logout      | Required | ออกจากระบบ + Blacklist token |
| GET    | /api/auth/me          | Required | ดูข้อมูลตัวเอง |
| POST   | /api/auth/refresh     | Public   | ต่ออายุ Access Token |

### Users
| Method | Endpoint                | Auth         | คำอธิบาย |
|--------|-------------------------|--------------|---------|
| GET    | /api/users              | Admin        | รายการผู้ใช้ (Pagination + Filter) |
| GET    | /api/users/:id          | Admin/Owner  | ดูข้อมูลผู้ใช้ |
| PUT    | /api/users/:id          | Admin/Owner  | แก้ไขข้อมูลผู้ใช้ |
| DELETE | /api/users/:id          | Admin        | ลบผู้ใช้ |
| PATCH  | /api/users/:id/status   | Admin        | เปิด/ปิด account |

### Query Parameters สำหรับ GET /api/users
```
?page=1&limit=10&search=alice&role=user&sort=createdAt&order=desc
```

---

## 8. Security Features

- **bcrypt** salt rounds = 10 สำหรับ password hashing
- **JWT** Access Token อายุ 15 นาที / Refresh Token อายุ 7 วัน
- **Token Blacklist** เมื่อ logout
- **Rate Limiting** `/api/auth/login` สูงสุด 5 ครั้ง/นาที
- **Helmet.js** HTTP Security Headers
- **ไม่ส่ง** password/refresh_token กลับใน Response ทุกกรณี
- Credentials ทั้งหมดเก็บใน Environment Variables
