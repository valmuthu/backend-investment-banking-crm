const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { User } = require('../models');
const { userValidation } = require('../utils/validators');
const { authenticateToken, validateRefreshToken } = require('../middleware/auth');
const { validationResult } = require('express-validator');

const router = express.Router();

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({ 
      message: 'Validation error', 
      errors: formattedErrors,
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window (increased for testing)
  message: {
    message: 'Too many authentication attempts, please try again later',
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Signup route
router.post('/signup', authLimiter, userValidation.signup, handleValidationErrors, async (req, res) => {
  try {
    console.log('Signup attempt:', { email: req.body.email });
    const { email, password, profile = {} } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ 
        message: 'User already exists with this email',
        code: 'USER_EXISTS'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      email,
      passwordHash,
      profile,
      lastLogin: new Date()
    });

    await user.save();
    console.log('User created successfully:', user.email);

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user._id, email: user.email }, 
      process.env.JWT_SECRET || 'fallback-secret-key', 
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    const refreshToken = jwt.sign(
      { id: user._id, email: user.email }, 
      process.env.REFRESH_TOKEN_SECRET || 'fallback-refresh-secret', 
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d' }
    );

    // Store refresh token
    user.refreshTokens = [refreshToken];
    await user.save();

    // Set secure cookie with refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      message: 'User created successfully',
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        profile: user.profile,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      message: 'Server error during signup',
      code: 'SIGNUP_ERROR'
    });
  }
});

// Login route
router.post('/login', authLimiter, userValidation.login, handleValidationErrors, async (req, res) => {
  try {
    console.log('Login attempt:', { email: req.body.email });
    const { email, password } = req.body;

    // Find user and include password hash for verification
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ 
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ 
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    console.log('User logged in successfully:', user.email);

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user._id, email: user.email }, 
      process.env.JWT_SECRET || 'fallback-secret-key', 
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    const refreshToken = jwt.sign(
      { id: user._id, email: user.email }, 
      process.env.REFRESH_TOKEN_SECRET || 'fallback-refresh-secret', 
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d' }
    );

    // Update refresh tokens (keep only latest 5)
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    await user.save();

    // Set secure cookie with refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        profile: user.profile,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login',
      code: 'LOGIN_ERROR'
    });
  }
});

// Refresh token route
router.post('/refresh', validateRefreshToken, async (req, res) => {
  try {
    const user = req.user;

    // Generate new access token
    const accessToken = jwt.sign(
      { id: user._id, email: user.email }, 
      process.env.JWT_SECRET || 'fallback-secret-key', 
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.json({
      message: 'Token refreshed successfully',
      accessToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      message: 'Server error during token refresh',
      code: 'REFRESH_ERROR'
    });
  }
});

// Logout route
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (refreshToken) {
      // Remove refresh token from user's stored tokens
      const user = await User.findById(req.user.id);
      if (user) {
        user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
        await user.save();
      }
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({ 
      message: 'Logout successful',
      code: 'LOGOUT_SUCCESS'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      message: 'Server error during logout',
      code: 'LOGOUT_ERROR'
    });
  }
});

// Verify token route (for checking if token is valid)
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    message: 'Token is valid',
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    },
    code: 'TOKEN_VALID'
  });
});

// Test route to check if auth routes are working
router.get('/test', (req, res) => {
  res.json({
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
