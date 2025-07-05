// routes/users.js
const express = require('express');
const bcrypt = require('bcrypt');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { userValidation, handleValidationErrors } = require('../utils/validators');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -refreshTokens');
    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      message: 'Error fetching profile',
      code: 'PROFILE_FETCH_ERROR'
    });
  }
});

// Update user profile
router.put('/profile', userValidation.updateProfile, handleValidationErrors, async (req, res) => {
  try {
    const { profile, preferences } = req.body;
    
    const user = await User.findById(req.user.id);
    if (profile) user.profile = { ...user.profile, ...profile };
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    
    await user.save();
    
    res.json({ 
      message: 'Profile updated successfully', 
      user: { 
        id: user._id, 
        email: user.email, 
        profile: user.profile, 
        preferences: user.preferences 
      } 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      message: 'Error updating profile',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
});

module.exports = router;
