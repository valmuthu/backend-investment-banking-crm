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
      field: error.path || error.param,
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

// Rate limiting for auth endpoints - More permissive for development
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 10, // Very high limit in dev
  message: {
    message: 'Too many authentication attempts, please try again later',
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  }
});

// Test route to check if auth routes are working
router.get('/test', (req, res) => {
  res.json({
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Signup route with better error handling
router.post('/signup', authLimiter, async (req, res) => {
  try {
    console.log('🔐 Signup attempt:', { 
      email: req.body.email,
      hasPassword: !!req.body.password,
      bodyKeys: Object.keys(req.body)
    });

    // Basic validation
    const { email, password, profile = {} } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Please provide a valid email address',
        code: 'INVALID_EMAIL'
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long',
        code: 'WEAK_PASSWORD'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({ 
        message: 'An account with this email already exists',
        code: 'USER_EXISTS'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      passwordHash,
      profile: {
        firstName: profile.firstName || '',
        lastName: profile.lastName || ''
      },
      lastLogin: new Date()
    });

    await user.save();
    console.log('✅ User created successfully:', user.email);

    // Generate tokens
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only';
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET || 'fallback-refresh-secret-for-development-only';

    const accessToken = jwt.sign(
      { id: user._id, email: user.email }, 
      jwtSecret, 
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    const refreshToken = jwt.sign(
      { id: user._id, email: user.email }, 
      refreshSecret, 
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
      },
      success: true
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    
    // Handle specific mongoose errors
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'An account with this email already exists',
        code: 'USER_EXISTS'
      });
    }
    
    res.status(500).json({ 
      message: 'An error occurred while creating your account. Please try again.',
      code: 'SIGNUP_ERROR',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// Login route with better error handling
router.post('/login', authLimiter, async (req, res) => {
  try {
    console.log('🔐 Login attempt:', { 
      email: req.body.email,
      hasPassword: !!req.body.password 
    });

    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user and include password hash for verification
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ 
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', email);
      return res.status(401).json({ 
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    console.log('✅ User logged in successfully:', user.email);

    // Generate tokens
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only';
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET || 'fallback-refresh-secret-for-development-only';

    const accessToken = jwt.sign(
      { id: user._id, email: user.email }, 
      jwtSecret, 
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    const refreshToken = jwt.sign(
      { id: user._id, email: user.email }, 
      refreshSecret, 
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
      },
      success: true
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      message: 'An error occurred while logging in. Please try again.',
      code: 'LOGIN_ERROR',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// Refresh token route
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        message: 'Refresh token required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    const refreshSecret = process.env.REFRESH_TOKEN_SECRET || 'fallback-refresh-secret-for-development-only';
    const decoded = jwt.verify(refreshToken, refreshSecret);
    const user = await User.findById(decoded.id).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Generate new access token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only';
    const accessToken = jwt.sign(
      { id: user._id, email: user.email }, 
      jwtSecret, 
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.json({
      message: 'Token refreshed successfully',
      accessToken,
      success: true
    });
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(401).json({ 
      message: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
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
      code: 'LOGOUT_SUCCESS',
      success: true
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
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
      role: req.user.role,
      profile: req.user.profile
    },
    code: 'TOKEN_VALID',
    success: true
  });
});

module.exports = router;
