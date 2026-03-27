'use strict';
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const sequelize = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const errorHandler = require('./middlewares/errorHandler');
const { createErrorResponse } = require('./utils/response');

const app = express();

// Security headers
app.use(helmet());

// CORS
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(o => o.trim());
app.use(cors({
  origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json(createErrorResponse('Route not found', null, 404));
});

// Global error handler
app.use(errorHandler);

const PORT = parseInt(process.env.PORT) || 3000;

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    await sequelize.sync({ alter: true });
    console.log('✅ Models synced');

    // Log registered routes (debug)
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📋 Registered routes:');
      app._router.stack
        .filter(r => r.name === 'router')
        .forEach(r => {
          r.handle.stack.forEach(layer => {
            if (layer.route) {
              const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase()).join(', ');
              console.log(`  ${methods} ${layer.route.path}`);
            }
          });
        });
      console.log('');
    }

    app.use((req, res) => {
      res.status(404).json(createErrorResponse('Route not found', null, 404));
    });

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Failed to start:', err);
    process.exit(1);
  }
};


if (require.main === module) {
  start();
}

module.exports = app;
