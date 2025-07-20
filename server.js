const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced logging
const logRequest = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    const logBody = { ...req.body };
    if (logBody.password) logBody.password = '[HIDDEN]';
    if (logBody.currentPassword) logBody.currentPassword = '[HIDDEN]';
    if (logBody.newPassword) logBody.newPassword = '[HIDDEN]';
    console.log('Request body:', logBody);
  }
  next();
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for API
}));
app.use(compression());

// Rate limiting with more detailed configuration
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    message: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.url === '/health';
  }
});
app.use(limiter);

// CORS configuration with better error handling
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
      : ['http://localhost:3000', 'http://localhost:5173'];
    
    console.log('CORS check - Origin:', origin, 'Allowed:', allowedOrigins);
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      console.error('Invalid JSON received:', e.message);
      res.status(400).json({ message: 'Invalid JSON', code: 'INVALID_JSON' });
      return;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging middleware
app.use(logRequest);

// Enhanced database connection with retry logic
const connectDB = async (retries = 5) => {
  try {
    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('MongoDB URI prefix:', process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) + '...' : 'Not set');
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: parseInt(process.env.DB_POOL_SIZE) || 10,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log(`✅ MongoDB Connected Successfully!`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🖥️  Host: ${conn.connection.host}:${conn.connection.port}`);
    console.log(`🔌 Connection state: ${getConnectionStateText(conn.connection.readyState)}`);
    
    // Connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('🟢 Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('🔴 MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🟡 Mongoose disconnected from MongoDB');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🟢 Mongoose reconnected to MongoDB');
    });

    return conn;

  } catch (error) {
    console.error(`❌ Database connection failed (attempt ${6-retries}/5):`, error.message);
    
    if (retries > 1) {
      console.log(`⏳ Retrying in 5 seconds... (${retries-1} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectDB(retries - 1);
    } else {
      console.error('💀 All connection attempts failed. Exiting...');
      process.exit(1);
    }
  }
};

// Helper function to get readable connection state
const getConnectionStateText = (state) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[state] || 'unknown';
};

// Environment validation
const validateEnvironment = () => {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    console.error('Please check your .env file');
    process.exit(1);
  }
  
  // Validate JWT secret length
  if (process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET should be at least 32 characters long');
  }
  
  console.log('✅ Environment variables validated');
};

// Validate environment before starting
validateEnvironment();

// Connect to database
connectDB();

// Import routes
const apiRoutes = require('./routes');

// Health check endpoint with enhanced details
app.get('/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const isDbConnected = dbState === 1;
    
    // Test database query
    let dbTest = false;
    try {
      await mongoose.connection.db.admin().ping();
      dbTest = true;
    } catch (err) {
      console.error('Database ping failed:', err.message);
    }

    const health = {
      status: isDbConnected && dbTest ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '2.0.0',
      uptime: Math.floor(process.uptime()),
      database: {
        connected: isDbConnected,
        state: getConnectionStateText(dbState),
        ping: dbTest
      },
      memory: process.memoryUsage(),
      node_version: process.version
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api/v1', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Investment Banking CRM API',
    version: '2.0.0',
    description: 'Backend API for Investment Banking CRM application',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      auth: '/api/v1/auth',
      contacts: '/api/v1/contacts',
      interviews: '/api/v1/interviews',
      dashboard: '/api/v1/dashboard'
    },
    documentation: {
      message: 'API documentation available',
      swagger: process.env.ENABLE_SWAGGER_DOCS === 'true' ? '/api-docs' : 'disabled'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    message: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    requestedUrl: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'GET /',
      'GET /health',
      'POST /api/v1/auth/login',
      'POST /api/v1/auth/signup',
      'GET /api/v1/contacts',
      'GET /api/v1/interviews',
      'GET /api/v1/dashboard/stats'
    ]
  });
});

// Enhanced global error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Unhandled error:', error);
  console.error('Request URL:', req.url);
  console.error('Request method:', req.method);
  console.error('Request headers:', req.headers);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: isDevelopment ? error.message : 'Invalid input data'
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid ID format',
      code: 'INVALID_ID',
      details: isDevelopment ? error.message : 'Invalid identifier'
    });
  }
  
  if (error.code === 11000) {
    return res.status(409).json({
      message: 'Duplicate entry',
      code: 'DUPLICATE_ENTRY',
      details: isDevelopment ? error.message : 'Resource already exists'
    });
  }
  
  // CORS errors
  if (error.message && error.message.includes('CORS')) {
    return res.status(403).json({
      message: 'CORS policy violation',
      code: 'CORS_ERROR',
      details: 'Origin not allowed'
    });
  }
  
  // Default error response
  res.status(error.status || 500).json({
    message: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { 
      stack: error.stack,
      details: error
    })
  });
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 ${signal} received, initiating graceful shutdown...`);
  
  server.close(async (err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ HTTP server closed');
    
   try {
      await mongoose.connection.close(false);  // pass false if you want no force close, but check docs if needed
      console.log('✅ MongoDB connection closed');
      console.log('👋 Graceful shutdown completed');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error closing MongoDB connection:', err);
      process.exit(1);
    }
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(PORT, () => {
  console.log('\n🚀 ================================');
  console.log('🚀 Server Started Successfully!');
  console.log('🚀 ================================');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base: http://localhost:${PORT}/api/v1`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/v1/auth`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/v1/dashboard`);
  console.log('🚀 ================================\n');
});

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  switch (error.code) {
    case 'EACCES':
      console.error(`❌ ${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`❌ ${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  console.error('Promise:', promise);
  console.error('Stack:', err.stack);
  
  // Close server gracefully
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});

module.exports = app;
