// routes/tasks.js
const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Placeholder for tasks functionality
router.get('/', async (req, res) => {
  try {
    res.json({
      message: 'Tasks feature coming soon',
      tasks: []
    });
  } catch (error) {
    console.error('Tasks error:', error);
    res.status(500).json({ 
      message: 'Error fetching tasks',
      code: 'TASKS_ERROR'
    });
  }
});

router.post('/', async (req, res) => {
  try {
    res.status(501).json({
      message: 'Tasks creation feature coming soon',
      code: 'FEATURE_NOT_IMPLEMENTED'
    });
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({ 
      message: 'Error creating task',
      code: 'TASK_CREATE_ERROR'
    });
  }
});

module.exports = router;
