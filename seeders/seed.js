'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../src/config/database');
const User = require('../src/models/User');

const SALT_ROUNDS = 10;

const seed = async () => {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

  const adminEmail = 'admin@example.com';
  const userEmail = 'user@example.com';

  const existing = await User.findOne({ where: { email: adminEmail } });
  if (existing) {
    console.log('Seed data already exists. Skipping.');
    await sequelize.close();
    return;
  }

  const adminPassword = await bcrypt.hash('Admin1234', SALT_ROUNDS);
  const userPassword = await bcrypt.hash('User1234', SALT_ROUNDS);

  await User.bulkCreate([
    {
      name: 'Admin User',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      is_active: true,
    },
    {
      name: 'Regular User',
      email: userEmail,
      password: userPassword,
      role: 'user',
      is_active: true,
    },
  ]);

  console.log('Seed complete!');
  console.log('  Admin  — email: admin@example.com  | password: Admin1234');
  console.log('  User   — email: user@example.com   | password: User1234');

  await sequelize.close();
};

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
