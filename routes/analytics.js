// routes/analytics.js
const express = require('express');
const { Analytics } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Track analytics event
router.post('/track', async (req, res) => {
  try {
    const { action, date = new Date().toISOString().split('T')[0] } = req.body;
    const userId = req.user.id;
    
    if (!action) {
      return res.status(400).json({
        message: 'Action is required',
        code: 'MISSING_ACTION'
      });
    }
    
    // Find or create analytics record for the date
    let analytics = await Analytics.findOne({ userId, date });
    
    if (!analytics) {
      analytics = new Analytics({ userId, date });
    }
    
    // Increment the appropriate metric
    switch (action) {
      case 'contact_added':
        analytics.metrics.contactsAdded += 1;
        break;
      case 'interaction_logged':
        analytics.metrics.interactionsLogged += 1;
        break;
      case 'interview_scheduled':
        analytics.metrics.interviewsScheduled += 1;
        break;
      case 'follow_up_completed':
        analytics.metrics.followUpsCompleted += 1;
        break;
      case 'document_created':
        analytics.metrics.documentsCreated += 1;
        break;
      default:
        return res.status(400).json({
          message: 'Invalid action',
          code: 'INVALID_ACTION'
        });
    }
    
    await analytics.save();
    res.json({ 
      message: 'Analytics tracked successfully',
      action,
      date
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({ 
      message: 'Error tracking analytics',
      code: 'ANALYTICS_ERROR'
    });
  }
});

module.exports = router;
