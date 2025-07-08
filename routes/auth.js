const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { User } = require('../models');
const { userValidation, handleValidationErrors } = require('../utils/validators');
const { authenticateToken, validateRefreshToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
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
    const { email, password, profile = {} } = req.body;

    console.log('Signup attempt for:', email);

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
      lastLogin: new Date(),
      emailVerified: false,
      status: 'active'
    });

    await user.save();
    console.log('User created successfully:', email);

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user._id, email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    const refreshToken = jwt.sign(
      { id: user._id, email: user.email }, 
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, 
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d' }
    );

    // Store refresh token
    user.refreshTokens = [refreshToken];
    await user.save();

    // Set secure cookie with refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
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
        createdAt: user.createdAt,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      message: 'Server error during signup',
      code: 'SIGNUP_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login route
router.post('/login', authLimiter, userValidation.login, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for:', email);

    // Find user and include password hash for verification
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ 
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    console.log('User found:', email, 'Status:', user.status);

    // Check if account is locked
    if (user.isLocked) {
      console.log('Account locked:', email);
      return res.status(423).json({
        message: 'Account temporarily locked due to too many failed login attempts',
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Check if account is active
    if (user.status !== 'active') {
      console.log('Account not active:', email, 'Status:', user.status);
      return res.status(401).json({
        message: 'Account is not active',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    console.log('Verifying password for:', email);

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      console.log('Invalid password for:', email);
      
      // Increment login attempts
      if (user.incLoginAttempts) {
        await user.incLoginAttempts();
      }
      
      return res.status(401).json({ 
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    console.log('Password valid for:', email);

    // Reset login attempts on successful login
    if (user.loginAttempts > 0 && user.resetLoginAttempts) {
      await user.resetLoginAttempts();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    console.log('Generating tokens for:', email);

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user._id, email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    const refreshToken = jwt.sign(
      { id: user._id, email: user.email }, 
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, 
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
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    console.log('Login successful for:', email);

    res.json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        profile: user.profile,
        role: user.role,
        lastLogin: user.lastLogin,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login',
      code: 'LOGIN_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      process.env.JWT_SECRET, 
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

// Logout from all devices
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshTokens = [];
      await user.save();
    }

    res.clearCookie('refreshToken');

    res.json({ 
      message: 'Logged out from all devices successfully',
      code: 'LOGOUT_ALL_SUCCESS'
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ 
      message: 'Server error during logout',
      code: 'LOGOUT_ALL_ERROR'
    });
  }
});

// Change password route
router.post('/change-password', authenticateToken, userValidation.changePassword, handleValidationErrors, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.passwordHash = newPasswordHash;
    user.refreshTokens = []; // Invalidate all refresh tokens
    await user.save();

    res.clearCookie('refreshToken');

    res.json({ 
      message: 'Password changed successfully. Please log in again.',
      code: 'PASSWORD_CHANGED'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      message: 'Server error during password change',
      code: 'PASSWORD_CHANGE_ERROR'
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

// Request password reset route
router.post('/forgot-password', authLimiter, userValidation.login, handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
      code: 'RESET_EMAIL_SENT'
    });

    if (user) {
      // Generate password reset token
      const resetToken = jwt.sign(
        { id: user._id, purpose: 'password-reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Store reset token and expiration
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      // TODO: Send email with reset link
      // await sendPasswordResetEmail(user.email, resetToken);
      console.log('Password reset token generated for:', email, 'Token:', resetToken);
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      message: 'Server error during password reset request',
      code: 'FORGOT_PASSWORD_ERROR'
    });
  }
});

// Reset password route
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: 'Token and new password are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Verify reset token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({
        message: 'Invalid reset token',
        code: 'INVALID_RESET_TOKEN'
      });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.passwordResetToken !== token || user.passwordResetExpires < new Date()) {
      return res.status(400).json({
        message: 'Invalid or expired reset token',
        code: 'INVALID_OR_EXPIRED_TOKEN'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    user.passwordHash = passwordHash;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = []; // Invalidate all refresh tokens
    await user.save();

    res.json({
      message: 'Password reset successful. Please log in with your new password.',
      code: 'PASSWORD_RESET_SUCCESS'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({
        message: 'Invalid or expired reset token',
        code: 'INVALID_OR_EXPIRED_TOKEN'
      });
    }
    res.status(500).json({ 
      message: 'Server error during password reset',
      code: 'RESET_PASSWORD_ERROR'
    });
  }
});

module.exports = router;
