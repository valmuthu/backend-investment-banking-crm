// routes/search.js
const express = require('express');
const { Contact, Interview, Document } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Global search endpoint
router.get('/', async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        message: 'Search query must be at least 2 characters',
        code: 'INVALID_SEARCH_QUERY'
      });
    }
    
    const searchRegex = { $regex: query, $options: 'i' };
    const userId = req.user.id;
    
    const [contacts, interviews, documents] = await Promise.all([
      Contact.find({
        userId,
        isArchived: { $ne: true },
        $or: [
          { name: searchRegex },
          { firm: searchRegex },
          { position: searchRegex },
          { email: searchRegex }
        ]
      }).select('name firm position email networkingStatus').limit(Number(limit)),
      
      Interview.find({
        userId,
        isArchived: { $ne: true },
        $or: [
          { firm: searchRegex },
          { position: searchRegex },
          { notes: searchRegex }
        ]
      }).select('firm position stage stageDate').limit(Number(limit)),
      
      Document.find({
        userId,
        isArchived: false,
        $or: [
          { name: searchRegex },
          { notes: searchRegex },
          { tags: searchRegex }
        ]
      }).select('name type tags').limit(Number(limit))
    ]);
    
    res.json({
      results: {
        contacts,
        interviews,
        documents
      },
      total: contacts.length + interviews.length + documents.length,
      query
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      message: 'Error performing search',
      code: 'SEARCH_ERROR'
    });
  }
});

module.exports = router;
