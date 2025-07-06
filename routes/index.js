const express = require('express');
const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({
    message: 'API routes working!',
    timestamp: new Date().toISOString()
  });
});

// Import auth routes
try {
  const authRoutes = require('./auth');
  router.use('/auth', authRoutes);
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
  
  // Fallback auth route
  router.get('/auth/test', (req, res) => {
    res.json({ message: 'Auth routes fallback working' });
  });
}

// Placeholder routes for other endpoints
router.get('/contacts', (req, res) => {
  res.json({
    message: 'Contacts endpoint',
    contacts: []
  });
});

router.get('/interviews', (req, res) => {
  res.json({
    message: 'Interviews endpoint',
    interviews: []
  });
});

router.get('/dashboard/stats', (req, res) => {
  res.json({
    message: 'Dashboard stats',
    stats: {
      totalContacts: 0,
      totalInterviews: 0
    }
  });
});

module.exports = router;
