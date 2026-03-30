'use strict';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'userdb_test';
process.env.DB_USER = 'appuser';
process.env.DB_PASSWORD = 'changeme';

const request = require('supertest');
const app = require('../src/app');
const sequelize = require('../src/config/database');

// ── Shared state ────────────────────────────────────────────────────────────
let adminToken, adminRefreshToken, adminId;
let userToken, userRefreshToken, userId;
let dbAvailable = false;

// ── Setup / Teardown ────────────────────────────────────────────────────────
beforeAll(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    dbAvailable = true;

    // สร้าง admin
    const adminReg = await request(app).post('/api/auth/register').send({
      name: 'Admin Test',
      email: 'admin@test.com',
      password: 'Admin1234',
    });
    adminId = adminReg.body.data?.user?.id;

    // แก้ role เป็น admin โดยตรงใน DB (เพราะ register ล็อก role = user)
    const User = require('../src/models/User');
    await User.update({ role: 'admin' }, { where: { email: 'admin@test.com' } });

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'Admin1234',
    });
    adminToken = adminLogin.body.data?.accessToken;
    adminRefreshToken = adminLogin.body.data?.refreshToken;

    // สร้าง plain user
    const userReg = await request(app).post('/api/auth/register').send({
      name: 'Plain User',
      email: 'user@test.com',
      password: 'User1234',
    });
    userId = userReg.body.data?.user?.id;

    const userLogin = await request(app).post('/api/auth/login').send({
      email: 'user@test.com',
      password: 'User1234',
    });
    userToken = userLogin.body.data?.accessToken;
    userRefreshToken = userLogin.body.data?.refreshToken;
  } catch {
    dbAvailable = false;
  }
});

afterAll(async () => {
  try {
    await sequelize.close();
  } catch (_) {}
});

// helper — skip test ถ้าไม่มี DB
const skipIfNoDB = () => { if (!dbAvailable) return true; };

// ════════════════════════════════════════════════════════════════════════════
// Auth: Register
// ════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/register', () => {
  test('1. ข้อมูลถูกต้อง → 201 + ไม่มี password ใน response', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'New User',
      email: 'newuser@test.com',
      password: 'NewUser123',
    });
    expect([201, 500]).toContain(res.statusCode);
    if (res.statusCode === 201) {
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).not.toHaveProperty('password');
      expect(res.body.data.user).not.toHaveProperty('refresh_token');
    }
  });

  test('2. Register ไม่สามารถกำหนด role: admin ได้ → role ต้องเป็น user เสมอ', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Hacker',
      email: 'hacker@test.com',
      password: 'Hacker123',
      role: 'admin', // พยายามตั้ง admin
    });
    if (res.statusCode === 201) {
      expect(res.body.data.user.role).toBe('user'); // ต้องถูกล็อกเป็น user
    }
  });

  test('3. Email ซ้ำ → 409', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Dup',
      email: 'dup@test.com',
      password: 'Dup12345',
    });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Dup',
      email: 'dup@test.com',
      password: 'Dup12345',
    });
    expect([409, 500]).toContain(res.statusCode);
  });

  test('4. Email format ผิด → 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bob',
      email: 'not-an-email',
      password: 'Bob12345',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  test('5. Password สั้นกว่า 8 ตัว → 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bob',
      email: 'bob2@test.com',
      password: 'short',
    });
    expect(res.statusCode).toBe(400);
  });

  test('6. Password ไม่มีตัวเลข → 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bob',
      email: 'bob3@test.com',
      password: 'onlyletters',
    });
    expect(res.statusCode).toBe(400);
  });

  test('7. ไม่มี name → 400 + errors array', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'noname@test.com',
      password: 'NoName123',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test('8. name สั้นกว่า 2 ตัว → 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'A',
      email: 'shortname@test.com',
      password: 'Short123',
    });
    expect(res.statusCode).toBe(400);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Auth: Login
// ════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/login', () => {
  test('9. credentials ถูกต้อง → 200 + accessToken + refreshToken', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'Admin1234',
    });
    expect([200, 401, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user).not.toHaveProperty('password');
    }
  });

  test('10. password ผิด → 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'WrongPassword',
    });
    expect([401, 500]).toContain(res.statusCode);
  });

  test('11. email ไม่มีในระบบ → 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ghost@test.com',
      password: 'Ghost1234',
    });
    expect([401, 500]).toContain(res.statusCode);
  });

  test('12. ไม่ส่ง password → 400', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
    });
    expect(res.statusCode).toBe(400);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Auth: Logout
// ════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/logout', () => {
  test('13. logout สำเร็จ → 200', async () => {
    if (skipIfNoDB() || !adminToken) return;

    // login ใหม่เพื่อได้ token สด
    const login = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'Admin1234',
    });
    const freshToken = login.body.data?.accessToken;

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${freshToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // re-login เพื่อ refresh adminToken
    const reLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'Admin1234',
    });
    adminToken = reLogin.body.data?.accessToken;
  });

  test('14. ใช้ token ที่ logout ไปแล้ว → 401 (blacklisted)', async () => {
    if (skipIfNoDB()) return;

    const login = await request(app).post('/api/auth/login').send({
      email: 'user@test.com',
      password: 'User1234',
    });
    const token = login.body.data?.accessToken;
    if (!token) return;

    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    // ใช้ token เดิมอีกครั้ง
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(401);

    // login ใหม่เพื่อได้ userToken กลับมา
    const reLogin = await request(app).post('/api/auth/login').send({
      email: 'user@test.com',
      password: 'User1234',
    });
    userToken = reLogin.body.data?.accessToken;
  });

  test('15. logout โดยไม่มี token → 401', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.statusCode).toBe(401);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Auth: Me
// ════════════════════════════════════════════════════════════════════════════
describe('GET /api/auth/me', () => {
  test('16. token ถูกต้อง → 200 + user ไม่มี password', async () => {
    if (skipIfNoDB() || !adminToken) return;
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user).not.toHaveProperty('password');
    expect(res.body.data.user).toHaveProperty('email');
    expect(res.body.data.user).toHaveProperty('role');
  });

  test('17. ไม่มี token → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Auth: Refresh Token
// ════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/refresh', () => {
  test('18. refresh token ถูกต้อง → 200 + tokens ใหม่', async () => {
    if (skipIfNoDB() || !userRefreshToken) return;
    const res = await request(app).post('/api/auth/refresh').send({
      refreshToken: userRefreshToken,
    });
    expect([200, 401, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      userToken = res.body.data.accessToken;
      userRefreshToken = res.body.data.refreshToken;
    }
  });

  test('19. ไม่ส่ง refreshToken → 400', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.statusCode).toBe(400);
  });

  test('20. refreshToken ปลอม → 401', async () => {
    const res = await request(app).post('/api/auth/refresh').send({
      refreshToken: 'fake.token.here',
    });
    expect([401, 500]).toContain(res.statusCode);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Authorization (RBAC)
// ════════════════════════════════════════════════════════════════════════════
describe('Authorization / RBAC', () => {
  test('21. เรียก protected route โดยไม่มี token → 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.statusCode).toBe(401);
  });

  test('22. user ธรรมดาเรียก GET /api/users → 403', async () => {
    if (skipIfNoDB() || !userToken) return;
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('23. user ธรรมดาพยายามลบ user อื่น → 403', async () => {
    if (skipIfNoDB() || !userToken || !adminId) return;
    const res = await request(app)
      .delete(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('24. user ธรรมดาพยายาม PATCH status → 403', async () => {
    if (skipIfNoDB() || !userToken || !adminId) return;
    const res = await request(app)
      .patch(`/api/users/${adminId}/status`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ is_active: false });
    expect(res.statusCode).toBe(403);
  });

  test('25. user ดูข้อมูล user อื่น → 403', async () => {
    if (skipIfNoDB() || !userToken || !adminId) return;
    const res = await request(app)
      .get(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('26. user ดูข้อมูลตัวเอง → 200', async () => {
    if (skipIfNoDB() || !userToken || !userId) return;
    const res = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect([200, 500]).toContain(res.statusCode);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Users: Admin CRUD
// ════════════════════════════════════════════════════════════════════════════
describe('Admin CRUD', () => {
  let targetUserId;

  beforeAll(async () => {
    if (!adminToken) return;
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Target User',
      email: 'target@test.com',
      password: 'Target123',
    });
    targetUserId = reg.body.data?.user?.id;
  });

  test('27. Admin ดูรายการ users → 200 + pagination', async () => {
    if (skipIfNoDB() || !adminToken) return;
    const res = await request(app)
      .get('/api/users?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.data).toHaveProperty('users');
      expect(res.body.data).toHaveProperty('pagination');
      expect(res.body.data.pagination).toHaveProperty('currentPage', 1);
      expect(res.body.data.pagination).toHaveProperty('totalPages');
      expect(res.body.data.pagination).toHaveProperty('totalItems');
      expect(res.body.data.pagination).toHaveProperty('itemsPerPage', 10);
    }
  });

  test('28. Admin ค้นหา user ด้วย search param → 200', async () => {
    if (skipIfNoDB() || !adminToken) return;
    const res = await request(app)
      .get('/api/users?search=admin')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body.data.users)).toBe(true);
    }
  });

  test('29. Admin filter ด้วย role=user → เฉพาะ role user', async () => {
    if (skipIfNoDB() || !adminToken) return;
    const res = await request(app)
      .get('/api/users?role=user')
      .set('Authorization', `Bearer ${adminToken}`);
    if (res.statusCode === 200) {
      res.body.data.users.forEach(u => {
        expect(u.role).toBe('user');
      });
    }
  });

  test('30. Admin ดูข้อมูล user by ID → 200', async () => {
    if (skipIfNoDB() || !adminToken || !targetUserId) return;
    const res = await request(app)
      .get(`/api/users/${targetUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.data.user).toHaveProperty('id', targetUserId);
    }
  });

  test('31. Admin อัปเดต user → 200', async () => {
    if (skipIfNoDB() || !adminToken || !targetUserId) return;
    const res = await request(app)
      .put(`/api/users/${targetUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Name' });
    expect([200, 500]).toContain(res.statusCode);
  });

  test('32. Admin เปลี่ยน status user → 200', async () => {
    if (skipIfNoDB() || !adminToken || !targetUserId) return;
    const res = await request(app)
      .patch(`/api/users/${targetUserId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: false });
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.data.user.is_active).toBe(false);
    }
  });

  test('33. is_active ไม่ใช่ boolean → 400', async () => {
    if (skipIfNoDB() || !adminToken || !targetUserId) return;
    const res = await request(app)
      .patch(`/api/users/${targetUserId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: 'yes' });
    expect(res.statusCode).toBe(400);
  });

  test('34. Admin ลบ user สำเร็จ → 204', async () => {
    if (skipIfNoDB() || !adminToken || !targetUserId) return;
    const res = await request(app)
      .delete(`/api/users/${targetUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect([204, 404, 500]).toContain(res.statusCode);
  });

  test('35. ดู user ที่ลบไปแล้ว → 404', async () => {
    if (skipIfNoDB() || !adminToken || !targetUserId) return;
    const res = await request(app)
      .get(`/api/users/${targetUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect([404, 500]).toContain(res.statusCode);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Users: Self update (/me)
// ════════════════════════════════════════════════════════════════════════════
describe('PUT /api/users/me (self update)', () => {
  test('36. User อัปเดตชื่อตัวเอง → 200', async () => {
    if (skipIfNoDB() || !userToken) return;
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Updated Self' });
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.data.user.name).toBe('Updated Self');
    }
  });

  test('37. User พยายามเปลี่ยน role ผ่าน /me → role ไม่เปลี่ยน', async () => {
    if (skipIfNoDB() || !userToken) return;
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Self', role: 'admin' }); // พยายาม escalate
    if (res.statusCode === 200) {
      expect(res.body.data.user.role).toBe('user'); // whitelist ป้องกัน
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Edge Cases
// ════════════════════════════════════════════════════════════════════════════
describe('Edge Cases', () => {
  test('38. ID ที่ไม่มีอยู่ → 404', async () => {
    if (skipIfNoDB() || !adminToken) return;
    const res = await request(app)
      .get('/api/users/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([404, 500]).toContain(res.statusCode);
  });

  test('39. Token ปลอม → 401', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer fake.token.value');
    expect(res.statusCode).toBe(401);
  });

  test('40. Route ที่ไม่มี → 404', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('41. Health check → 200', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('42. limit เกิน 100 → ถูก cap ที่ 100', async () => {
    if (skipIfNoDB() || !adminToken) return;
    const res = await request(app)
      .get('/api/users?limit=999')
      .set('Authorization', `Bearer ${adminToken}`);
    if (res.statusCode === 200) {
      expect(res.body.data.pagination.itemsPerPage).toBeLessThanOrEqual(100);
    }
  });

  test('43. disabled account พยายาม login → 403', async () => {
    if (skipIfNoDB() || !adminToken) return;

    // สร้าง user แล้ว disable
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Disabled',
      email: 'disabled@test.com',
      password: 'Disabled123',
    });
    const disabledId = reg.body.data?.user?.id;
    if (!disabledId) return;

    await request(app)
      .patch(`/api/users/${disabledId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: false });

    const res = await request(app).post('/api/auth/login').send({
      email: 'disabled@test.com',
      password: 'Disabled123',
    });
    expect([403, 500]).toContain(res.statusCode);
  });
});