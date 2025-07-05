const { body, param, query, validationResult } = require('express-validator');

// Enhanced validation with better error messages
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

// User validation
const userValidation = {
  signup: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])?[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('profile.firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    body('profile.lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters'),
    body('profile.university')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('University name must be less than 100 characters'),
    body('profile.graduationYear')
      .optional()
      .isInt({ min: 1950, max: 2030 })
      .withMessage('Graduation year must be between 1950 and 2030')
  ],
  
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  
  updateProfile: [
    body('profile.firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    body('profile.lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters'),
    body('profile.phoneNumber')
      .optional()
      .matches(/^[\+]?[(]?[\d\s\-\(\)]{10,}$/)
      .withMessage('Please provide a valid phone number'),
    body('profile.linkedinUrl')
      .optional()
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('LinkedIn URL must be a valid URL')
  ],
  
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])?[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
  ]
};

// Contact validation
const contactValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Contact name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters'),
    body('firm')
      .trim()
      .notEmpty()
      .withMessage('Firm name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Firm name must be between 1 and 100 characters'),
    body('position')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Position must be less than 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('phone')
      .optional()
      .matches(/^[\+]?[(]?[\d\s\-\(\)]{10,}$/)
      .withMessage('Please provide a valid phone number'),
    body('linkedin')
      .optional()
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('LinkedIn URL must be a valid URL'),
    body('networkingStatus')
      .optional()
      .isIn([
        'Not Yet Contacted', 'Initial Outreach Sent', 'Intro Call Scheduled',
        'Intro Call Complete', 'Follow-Up Email Sent', 'Follow-Up Call Scheduled',
        'Follow-Up Call Complete', 'Regular Contact'
      ])
      .withMessage('Invalid networking status'),
    body('seniority')
      .optional()
      .isIn(['Analyst', 'Associate', 'VP', 'Director', 'MD', 'Other'])
      .withMessage('Invalid seniority level'),
    body('networkingDate')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format'),
    body('nextStepsDate')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format'),
    body('notes')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Notes must be less than 2000 characters'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('tags.*')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each tag must be between 1 and 50 characters')
  ],
  
  update: [
    param('id').isMongoId().withMessage('Invalid contact ID'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters'),
    body('firm')
      .optional()
      .trim()
      .notEmpty()
      .isLength({ min: 1, max: 100 })
      .withMessage('Firm name must be between 1 and 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('phone')
      .optional()
      .matches(/^[\+]?[(]?[\d\s\-\(\)]{10,}$/)
      .withMessage('Please provide a valid phone number'),
    body('linkedin')
      .optional()
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('LinkedIn URL must be a valid URL')
  ],
  
  addInteraction: [
    param('id').isMongoId().withMessage('Invalid contact ID'),
    body('type')
      .isIn(['Call', 'Email', 'Meeting', 'Note', 'Coffee Chat', 'Event'])
      .withMessage('Invalid interaction type'),
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Interaction title is required')
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format'),
    body('duration')
      .optional()
      .isInt({ min: 1, max: 600 })
      .withMessage('Duration must be between 1 and 600 minutes'),
    body('notes')
      .trim()
      .notEmpty()
      .withMessage('Interaction notes are required')
      .isLength({ min: 1, max: 2000 })
      .withMessage('Notes must be between 1 and 2000 characters'),
    body('sentiment')
      .optional()
      .isIn(['Positive', 'Neutral', 'Negative'])
      .withMessage('Invalid sentiment value')
  ]
};

// Interview validation
const interviewValidation = {
  create: [
    body('firm')
      .trim()
      .notEmpty()
      .withMessage('Firm name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Firm name must be between 1 and 100 characters'),
    body('position')
      .trim()
      .notEmpty()
      .withMessage('Position is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Position must be between 1 and 100 characters'),
    body('group')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Group must be less than 50 characters'),
    body('office')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Office must be less than 50 characters'),
    body('stage')
      .optional()
      .isIn([
        'Not Yet Applied', 'Applied', 'Phone Screen', 'First Round',
        'Second Round', 'Third Round', 'Case Study', 'Superday',
        'Final Round', 'Offer Received', 'Rejected', 'Withdrawn'
      ])
      .withMessage('Invalid interview stage'),
    body('stageDate')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format'),
    body('applicationDate')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format'),
    body('deadline')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format'),
    body('priority')
      .optional()
      .isIn(['High', 'Medium', 'Low'])
      .withMessage('Invalid priority level'),
    body('notes')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Notes must be less than 2000 characters'),
    body('referralContactId')
      .optional()
      .isMongoId()
      .withMessage('Invalid referral contact ID')
  ],
  
  update: [
    param('id').isMongoId().withMessage('Invalid interview ID'),
    body('firm')
      .optional()
      .trim()
      .notEmpty()
      .isLength({ min: 1, max: 100 })
      .withMessage('Firm name must be between 1 and 100 characters'),
    body('position')
      .optional()
      .trim()
      .notEmpty()
      .isLength({ min: 1, max: 100 })
      .withMessage('Position must be between 1 and 100 characters'),
    body('stage')
      .optional()
      .isIn([
        'Not Yet Applied', 'Applied', 'Phone Screen', 'First Round',
        'Second Round', 'Third Round', 'Case Study', 'Superday',
        'Final Round', 'Offer Received', 'Rejected', 'Withdrawn'
      ])
      .withMessage('Invalid interview stage')
  ],
  
  addRound: [
    param('id').isMongoId().withMessage('Invalid interview ID'),
    body('stage')
      .isIn(['Phone Screen', 'First Round', 'Second Round', 'Third Round', 'Case Study', 'Superday', 'Final Round'])
      .withMessage('Invalid interview round stage'),
    body('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format'),
    body('time')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Time must be in HH:MM format'),
    body('duration')
      .optional()
      .isInt({ min: 15, max: 480 })
      .withMessage('Duration must be between 15 and 480 minutes'),
    body('interviewer')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Interviewer name must be less than 100 characters'),
    body('format')
      .optional()
      .isIn(['Phone', 'Video', 'In-Person', 'Assessment', 'Case Study'])
      .withMessage('Invalid interview format'),
    body('outcome')
      .optional()
      .isIn(['Pending', 'Passed', 'Failed', 'Cancelled', 'Rescheduled'])
      .withMessage('Invalid outcome'),
    body('notes')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Notes must be less than 2000 characters'),
    body('rating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5')
  ]
};

// Document validation
const documentValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Document name is required')
      .isLength({ min: 1, max: 200 })
      .withMessage('Document name must be between 1 and 200 characters'),
    body('type')
      .isIn([
        'Resume', 'Cover Letter', 'Email Template', 'Thank You Email',
        'Follow-up Template', 'Meeting Notes', 'Referral Letter',
        'Case Study', 'Presentation', 'Research', 'Other'
      ])
      .withMessage('Invalid document type'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('content')
      .optional()
      .isLength({ max: 50000 })
      .withMessage('Content must be less than 50,000 characters'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('tags.*')
      .optional()
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage('Each tag must be between 1 and 30 characters'),
    body('associatedContacts')
      .optional()
      .isArray()
      .withMessage('Associated contacts must be an array'),
    body('associatedFirms')
      .optional()
      .isArray()
      .withMessage('Associated firms must be an array'),
    body('notes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Notes must be less than 1000 characters')
  ],
  
  update: [
    param('id').isMongoId().withMessage('Invalid document ID'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .isLength({ min: 1, max: 200 })
      .withMessage('Document name must be between 1 and 200 characters'),
    body('type')
      .optional()
      .isIn([
        'Resume', 'Cover Letter', 'Email Template', 'Thank You Email',
        'Follow-up Template', 'Meeting Notes', 'Referral Letter',
        'Case Study', 'Presentation', 'Research', 'Other'
      ])
      .withMessage('Invalid document type'),
    body('content')
      .optional()
      .isLength({ max: 50000 })
      .withMessage('Content must be less than 50,000 characters')
  ]
};

// Task validation
const taskValidation = {
  create: [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Task title is required')
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('type')
      .isIn(['Contact', 'Interview', 'Application', 'Follow-up', 'Research', 'Other'])
      .withMessage('Invalid task type'),
    body('priority')
      .optional()
      .isIn(['High', 'Medium', 'Low'])
      .withMessage('Invalid priority level'),
    body('dueDate')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Due date must be in YYYY-MM-DD format'),
    body('dueTime')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Due time must be in HH:MM format'),
    body('estimatedDuration')
      .optional()
      .isInt({ min: 5, max: 600 })
      .withMessage('Estimated duration must be between 5 and 600 minutes'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('relatedContact')
      .optional()
      .isMongoId()
      .withMessage('Invalid contact ID'),
    body('relatedInterview')
      .optional()
      .isMongoId()
      .withMessage('Invalid interview ID')
  ],
  
  update: [
    param('id').isMongoId().withMessage('Invalid task ID'),
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('status')
      .optional()
      .isIn(['Pending', 'In Progress', 'Completed', 'Cancelled'])
      .withMessage('Invalid task status'),
    body('priority')
      .optional()
      .isIn(['High', 'Medium', 'Low'])
      .withMessage('Invalid priority level'),
    body('actualDuration')
      .optional()
      .isInt({ min: 1, max: 600 })
      .withMessage('Actual duration must be between 1 and 600 minutes')
  ]
};

// Goal validation
const goalValidation = {
  create: [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Goal title is required')
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('category')
      .isIn(['Networking', 'Applications', 'Interviews', 'Learning', 'Personal'])
      .withMessage('Invalid goal category'),
    body('type')
      .optional()
      .isIn(['Count', 'Percentage', 'Binary'])
      .withMessage('Invalid goal type'),
    body('target')
      .isNumeric()
      .withMessage('Target must be a number')
      .custom((value) => {
        if (value <= 0) {
          throw new Error('Target must be greater than 0');
        }
        return true;
      }),
    body('timeframe')
      .isIn(['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Custom'])
      .withMessage('Invalid timeframe'),
    body('startDate')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Start date must be in YYYY-MM-DD format'),
    body('endDate')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('End date must be in YYYY-MM-DD format')
      .custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.startDate)) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters')
  ]
};

// Query parameter validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .escape()
];

const dateRangeValidation = [
  query('startDate')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Start date must be in YYYY-MM-DD format'),
  query('endDate')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('End date must be in YYYY-MM-DD format')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) <= new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

// Custom validators
const customValidators = {
  // Validate MongoDB ObjectId
  isValidObjectId: (value) => {
    if (!value.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid ID format');
    }
    return true;
  },
  
  // Validate date is not in the past (with optional tolerance)
  isNotPastDate: (tolerance = 0) => (value) => {
    const date = new Date(value);
    const now = new Date();
    now.setDate(now.getDate() - tolerance);
    
    if (date < now) {
      throw new Error(`Date cannot be more than ${tolerance} days in the past`);
    }
    return true;
  },
  
  // Validate date is not too far in the future
  isNotFutureDateBeyond: (years = 5) => (value) => {
    const date = new Date(value);
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + years);
    
    if (date > maxDate) {
      throw new Error(`Date cannot be more than ${years} years in the future`);
    }
    return true;
  },
  
  // Validate URL with specific domains
  isValidDomain: (domains) => (value) => {
    if (!value) return true; // Optional field
    
    try {
      const url = new URL(value);
      const isValidDomain = domains.some(domain => 
        url.hostname.includes(domain)
      );
      
      if (!isValidDomain) {
        throw new Error(`URL must be from one of these domains: ${domains.join(', ')}`);
      }
      return true;
    } catch {
      throw new Error('Invalid URL format');
    }
  },
  
  // Validate array length
  hasArrayLength: (min = 0, max = 100) => (value) => {
    if (!Array.isArray(value)) {
      throw new Error('Value must be an array');
    }
    if (value.length < min || value.length > max) {
      throw new Error(`Array must have between ${min} and ${max} items`);
    }
    return true;
  },
  
  // Validate phone number with country code
  isValidPhoneNumber: (value) => {
    if (!value) return true; // Optional field
    
    // Remove all non-digit characters except +
    const cleaned = value.replace(/[^\d+]/g, '');
    
    // Check if it's a valid international format
    if (!/^\+?[1-9]\d{7,14}$/.test(cleaned)) {
      throw new Error('Please provide a valid phone number');
    }
    return true;
  },
  
  // Validate password strength
  isStrongPassword: (value) => {
    const minLength = 8;
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
    
    if (value.length < minLength) {
      throw new Error(`Password must be at least ${minLength} characters long`);
    }
    if (!hasUpper) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (!hasLower) {
      throw new Error('Password must contain at least one lowercase letter');
    }
    if (!hasNumber) {
      throw new Error('Password must contain at least one number');
    }
    
    return true;
  }
};

// Sanitization helpers
const sanitizers = {
  // Remove HTML tags and encode special characters
  sanitizeText: (value) => {
    return value
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>&"']/g, (char) => { // Encode special characters
        const entityMap = {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;',
          "'": '&#x27;'
        };
        return entityMap[char];
      })
      .trim();
  },
  
  // Normalize and validate email
  normalizeEmail: (value) => {
    return value.toLowerCase().trim();
  },
  
  // Clean and format phone number
  formatPhoneNumber: (value) => {
    if (!value) return value;
    
    // Remove all non-digit characters except +
    const cleaned = value.replace(/[^\d+]/g, '');
    
    // Add + if it starts with a digit and looks like international
    if (/^\d{10,}$/.test(cleaned)) {
      return `+${cleaned}`;
    }
    
    return cleaned;
  },
  
  // Clean URLs
  normalizeUrl: (value) => {
    if (!value) return value;
    
    let url = value.trim();
    
    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    
    try {
      const urlObj = new URL(url);
      return urlObj.toString();
    } catch {
      return value; // Return original if invalid
    }
  }
};

module.exports = {
  handleValidationErrors,
  userValidation,
  contactValidation,
  interviewValidation,
  documentValidation,
  taskValidation,
  goalValidation,
  paginationValidation,
  dateRangeValidation,
  customValidators,
  sanitizers
};
