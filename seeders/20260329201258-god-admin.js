const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('admin1234', 10);
    return queryInterface.bulkInsert('users', [{
      name: 'GOD Admin',
      email: 'admin@system.com',
      password: hashedPassword,
      role: 'admin',
    }]);
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('users', { email: 'admin@system.com' }, {});
  }
};