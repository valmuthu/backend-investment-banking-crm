const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const router = express.Router();

// In-memory user storage for testing (replace with database later)
const users = [];

// Test route
router.get('/test', (req, res) => {
  res.json({
    message: 'Auth routes working!',
    timestamp: new Date().toISOString()
  });
});

// Signup route
router.post('/signup', async (req, res) => {
  try {
    console.log('📝 Signup request:', req.body);
    
    const { email, password, profile = {} } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Check if user exists
    const existingUser = users.find(u => u.email === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists',
        code: 'USER_EXISTS'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      id: Date.now().toString(),
      email: email.toLowerCase(),
      passwordHash,
      profile,
      createdAt: new Date()
    };

    users.push(user);
    console.log('✅ User created:', user.email);

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile
      }
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({
      message: 'Signup failed',
      error: error.message
    });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login request:', req.body);
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user
    const user = users.find(u => u.email === email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    console.log('✅ Login successful:', user.email);

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      message: 'Login failed',
      error: error.message
    });
  }
});

// Verify token
router.get('/verify', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        message: 'No token provided',
        code: 'MISSING_TOKEN'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = users.find(u => u.id === decoded.id);

    if (!user) {
      return res.status(401).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      message: 'Token valid',
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile
      }
    });

  } catch (error) {
    res.status(401).json({
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
});

module.exports = router;
