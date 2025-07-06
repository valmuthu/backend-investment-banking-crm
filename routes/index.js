const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const userRoutes = require('./users');
const contactRoutes = require('./contacts');
const interviewRoutes = require('./interviews');
const documentRoutes = require('./documents');
const taskRoutes = require('./tasks');
const goalRoutes = require('./goals');
const analyticsRoutes = require('./analytics');
const dashboardRoutes = require('./dashboard');
const searchRoutes = require('./search');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    uptime: process.uptime()
  });
});

// API Info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Investment Banking CRM API',
    version: '2.0.0',
    description: 'Backend API for Investment Banking CRM application',
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      contacts: '/api/v1/contacts',
      interviews: '/api/v1/interviews',
      documents: '/api/v1/documents',
      tasks: '/api/v1/tasks',
      goals: '/api/v1/goals',
      analytics: '/api/v1/analytics',
      dashboard: '/api/v1/dashboard',
      search: '/api/v1/search'
    }
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/contacts', contactRoutes);
router.use('/interviews', interviewRoutes);
router.use('/documents', documentRoutes);
router.use('/tasks', taskRoutes);
router.use('/goals', goalRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/search', searchRoutes);

module.exports = router;
