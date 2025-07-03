const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.'
});

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://symphonious-chimera-c849b5.netlify.app', 'https://your-custom-domain.com']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// MongoDB connection with better error handling
mongoose.connect(process.env.MONGODB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Enhanced Schemas with validation
const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

const contactSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  name: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  position: { type: String, trim: true },
  email: { 
    type: String, 
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: { type: String, trim: true },
  dealValue: { type: String },
  status: { 
    type: String, 
    enum: ['Cold Lead', 'Hot Lead', 'In Progress', 'Closed', 'Lost'],
    default: 'Cold Lead'
  },
  lastContact: { type: Date, default: Date.now },
  notes: { type: String },
  linkedin: { type: String },
  referred: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const interviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  company: { type: String, required: true },
  position: { type: String, required: true },
  date: { type: String, required: true }, // Using String to match frontend format
  time: { type: String, required: true },
  interviewer: { type: String },
  status: { 
    type: String, 
    enum: ['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled'],
    default: 'Scheduled'
  },
  stage: { 
    type: String, 
    enum: ['Phone Screen', 'First Round', 'Second Round', 'Final Round', 'Case Study'],
    default: 'Phone Screen'
  },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['Resume', 'Cover Letter', 'Template', 'Transcript', 'Other'],
    required: true 
  },
  url: { type: String },
  size: { type: String },
  uploadDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  status: { 
    type: String, 
    enum: ['Active', 'Archived', 'Draft'],
    default: 'Active'
  },
  createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Contact = mongoose.model('Contact', contactSchema);
const Interview = mongoose.model('Interview', interviewSchema);
const Document = mongoose.model('Document', documentSchema);

// Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed', 
      errors: errors.array() 
    });
  }
  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: 'Validation error', 
      errors: Object.values(err.errors).map(e => e.message) 
    });
  }
  
  if (err.code === 11000) {
    return res.status(409).json({ 
      message: 'Duplicate entry', 
      field: Object.keys(err.keyPattern)[0] 
    });
  }
  
  res.status(500).json({ 
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
};

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Investment Banking CRM API is running',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Auth routes
app.post('/signup', 
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: 'User already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = new User({ email, passwordHash });
      await user.save();

      const token = jwt.sign(
        { id: user._id, email: user.email }, 
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.status(201).json({ 
        message: 'User created successfully',
        token,
        user: { id: user._id, email: user.email }
      });
    } catch (error) {
      next(error);
    }
  }
);

app.post('/login', 
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      const token = jwt.sign(
        { id: user._id, email: user.email }, 
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({ 
        message: 'Login successful',
        token,
        user: { id: user._id, email: user.email }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Contact routes
app.get('/contacts', authenticateToken, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;
    const query = { userId: req.user.id };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    const contacts = await Contact.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Contact.countDocuments(query);
    
    res.json({
      contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post('/contacts', 
  authenticateToken,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('company').trim().notEmpty().withMessage('Company is required'),
    body('email').optional().isEmail().normalizeEmail()
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const contactData = { ...req.body, userId: req.user.id };
      const contact = new Contact(contactData);
      await contact.save();
      res.status(201).json(contact);
    } catch (error) {
      next(error);
    }
  }
);

app.put('/contacts/:id', 
  authenticateToken,
  [
    body('name').optional().trim().notEmpty(),
    body('company').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail()
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const contact = await Contact.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { ...req.body, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
      
      if (!contact) {
        return res.status(404).json({ message: 'Contact not found' });
      }
      
      res.json(contact);
    } catch (error) {
      next(error);
    }
  }
);

app.delete('/contacts/:id', authenticateToken, async (req, res, next) => {
  try {
    const result = await Contact.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Interview routes
app.get('/interviews', authenticateToken, async (req, res, next) => {
  try {
    const interviews = await Interview.find({ userId: req.user.id })
      .sort({ date: 1 })
      .populate('contactId', 'name company');
    res.json(interviews);
  } catch (error) {
    next(error);
  }
});

app.post('/interviews', 
  authenticateToken,
  [
    body('company').trim().notEmpty().withMessage('Company is required'),
    body('position').trim().notEmpty().withMessage('Position is required'),
    body('date').notEmpty().withMessage('Date is required'),
    body('time').notEmpty().withMessage('Time is required')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const interview = new Interview({ ...req.body, userId: req.user.id });
      await interview.save();
      res.status(201).json(interview);
    } catch (error) {
      next(error);
    }
  }
);

app.put('/interviews/:id', authenticateToken, async (req, res, next) => {
  try {
    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }
    
    res.json(interview);
  } catch (error) {
    next(error);
  }
});

app.delete('/interviews/:id', authenticateToken, async (req, res, next) => {
  try {
    const result = await Interview.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Interview not found' });
    }
    res.json({ message: 'Interview deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Document routes
app.get('/documents', authenticateToken, async (req, res, next) => {
  try {
    const documents = await Document.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    next(error);
  }
});

app.post('/documents', 
  authenticateToken,
  [
    body('name').trim().notEmpty().withMessage('Document name is required'),
    body('type').isIn(['Resume', 'Cover Letter', 'Template', 'Transcript', 'Other']).withMessage('Invalid document type')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const document = new Document({ ...req.body, userId: req.user.id });
      await document.save();
      res.status(201).json(document);
    } catch (error) {
      next(error);
    }
  }
);

app.put('/documents/:id', authenticateToken, async (req, res, next) => {
  try {
    const document = await Document.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.json(document);
  } catch (error) {
    next(error);
  }
});

app.delete('/documents/:id', authenticateToken, async (req, res, next) => {
  try {
    const result = await Document.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Analytics route
app.get('/analytics', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const [contactCount, interviewCount, documentCount, contactsByStatus] = await Promise.all([
      Contact.countDocuments({ userId }),
      Interview.countDocuments({ userId }),
      Document.countDocuments({ userId }),
      Contact.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);
    
    const totalDealValue = await Contact.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { 
        $addFields: { 
          dealValueNum: { 
            $toDouble: { 
              $replaceAll: { 
                input: { $replaceAll: { input: '$dealValue', find: '$', replacement: '' } }, 
                find: 'M', 
                replacement: '' 
              } 
            } 
          } 
        } 
      },
      { $group: { _id: null, total: { $sum: '$dealValueNum' } } }
    ]);
    
    res.json({
      contacts: contactCount,
      interviews: interviewCount,
      documents: documentCount,
      totalDealValue: totalDealValue[0]?.total || 0,
      contactsByStatus: contactsByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (error) {
    next(error);
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});
