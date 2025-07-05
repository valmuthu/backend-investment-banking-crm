const express = require('express');
const { Interview, Contact } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { interviewValidation, paginationValidation, handleValidationErrors } = require('../utils/validators');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all interviews with filtering and pagination
router.get('/', paginationValidation, handleValidationErrors, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      stage, 
      firm, 
      group, 
      priority,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { userId: req.user.id, isArchived: { $ne: true } };
    
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { firm: searchRegex },
        { position: searchRegex },
        { group: searchRegex },
        { notes: searchRegex }
      ];
    }
    
    if (stage) query.stage = stage;
    if (firm) query.firm = { $regex: firm, $options: 'i' };
    if (group) query.group = { $regex: group, $options: 'i' };
    if (priority) query.priority = priority;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const interviews = await Interview.find(query)
      .populate('referralContactId', 'name firm position')
      .sort(sort)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Interview.countDocuments(query);

    res.json({
      interviews,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: Number(limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Interviews fetch error:', error);
    res.status(500).json({ 
      message: 'Error fetching interviews',
      code: 'INTERVIEWS_FETCH_ERROR'
    });
  }
});

// Create new interview
router.post('/', interviewValidation.create, handleValidationErrors, async (req, res) => {
  try {
    const interviewData = { ...req.body, userId: req.user.id };
    const interview = new Interview(interviewData);
    await interview.save();
    
    const populatedInterview = await Interview.findById(interview._id)
      .populate('referralContactId', 'name firm position');
    
    res.status(201).json({ 
      message: 'Interview created successfully', 
      interview: populatedInterview 
    });
  } catch (error) {
    console.error('Interview creation error:', error);
    res.status(500).json({ 
      message: 'Error creating interview',
      code: 'INTERVIEW_CREATE_ERROR'
    });
  }
});

// Get single interview
router.get('/:id', async (req, res) => {
  try {
    const interview = await Interview.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    }).populate('referralContactId', 'name firm position');
    
    if (!interview) {
      return res.status(404).json({ 
        message: 'Interview not found',
        code: 'INTERVIEW_NOT_FOUND'
      });
    }
    
    res.json({ interview });
  } catch (error) {
    console.error('Interview fetch error:', error);
    res.status(500).json({ 
      message: 'Error fetching interview',
      code: 'INTERVIEW_FETCH_ERROR'
    });
  }
});

// Update interview
router.put('/:id', interviewValidation.update, handleValidationErrors, async (req, res) => {
  try {
    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).populate('referralContactId', 'name firm position');
    
    if (!interview) {
      return res.status(404).json({ 
        message: 'Interview not found',
        code: 'INTERVIEW_NOT_FOUND'
      });
    }
    
    res.json({ 
      message: 'Interview updated successfully', 
      interview 
    });
  } catch (error) {
    console.error('Interview update error:', error);
    res.status(500).json({ 
      message: 'Error updating interview',
      code: 'INTERVIEW_UPDATE_ERROR'
    });
  }
});

// Delete interview
router.delete('/:id', async (req, res) => {
  try {
    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isArchived: true, archivedAt: new Date() },
      { new: true }
    );
    
    if (!interview) {
      return res.status(404).json({ 
        message: 'Interview not found',
        code: 'INTERVIEW_NOT_FOUND'
      });
    }
    
    res.json({ 
      message: 'Interview archived successfully',
      code: 'INTERVIEW_ARCHIVED'
    });
  } catch (error) {
    console.error('Interview deletion error:', error);
    res.status(500).json({ 
      message: 'Error archiving interview',
      code: 'INTERVIEW_DELETE_ERROR'
    });
  }
});

// Add interview round
router.post('/:id/rounds', interviewValidation.addRound, handleValidationErrors, async (req, res) => {
  try {
    const interview = await Interview.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!interview) {
      return res.status(404).json({ 
        message: 'Interview not found',
        code: 'INTERVIEW_NOT_FOUND'
      });
    }
    
    const round = {
      ...req.body,
      createdAt: new Date()
    };
    
    interview.rounds.push(round);
    interview.updatedAt = new Date();
    await interview.save();
    
    res.status(201).json({ 
      message: 'Interview round added successfully', 
      round: interview.rounds[interview.rounds.length - 1] 
    });
  } catch (error) {
    console.error('Interview round creation error:', error);
    res.status(500).json({ 
      message: 'Error adding interview round',
      code: 'ROUND_CREATE_ERROR'
    });
  }
});

module.exports = router;
