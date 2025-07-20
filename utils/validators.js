const { body, param, query, validationResult } = require('express-validator');

// Enhanced validation with better error messages
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    
    console.log('Validation errors:', formattedErrors);
    
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
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
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
      .withMessage('LinkedIn URL must be a valid URL'),
    body('preferences.theme')
      .optional()
      .isIn(['light', 'dark', 'auto'])
      .withMessage('Theme must be light, dark, or auto'),
    body('preferences.notifications')
      .optional()
      .isBoolean()
      .withMessage('Notifications must be true or false'),
    body('preferences.timezone')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Timezone must be between 1 and 50 characters')
  ],
  
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],
  
  forgotPassword: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address')
  ],
  
  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
  ]
};

// Contact validation - Updated with better error handling
const contactValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Contact name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters')
      .custom((value) => {
        if (!/^[a-zA-Z\s\-\.,']+$/.test(value)) {
          throw new Error('Name can only contain letters, spaces, hyphens, periods, commas, and apostrophes');
        }
        return true;
      }),
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
      .custom((value) => {
        if (value && value.trim() !== '') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            throw new Error('Please provide a valid email address');
          }
        }
        return true;
      })
      .normalizeEmail(),
    body('phone')
      .optional()
      .custom((value) => {
        if (value && value.trim() !== '') {
          const phoneRegex = /^[\+]?[(]?[\d\s\-\(\)]{10,}$/;
          if (!phoneRegex.test(value)) {
            throw new Error('Please provide a valid phone number');
          }
        }
        return true;
      }),
    body('linkedin')
      .optional()
      .custom((value) => {
        if (value && value.trim() !== '') {
          try {
            new URL(value);
            if (!value.includes('linkedin.com')) {
              throw new Error('LinkedIn URL must be from linkedin.com');
            }
          } catch {
            throw new Error('LinkedIn URL must be a valid URL');
          }
        }
        return true;
      }),
    body('group')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Group must be less than 50 characters'),
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
    body('priority')
      .optional()
      .isIn(['High', 'Medium', 'Low'])
      .withMessage('Invalid priority level'),
    body('actualDuration')
      .optional()
      .isInt({ min: 1, max: 600 })
      .withMessage('Actual duration must be between 1 and 600 minutes'),
    body('completedAt')
      .optional()
      .isISO8601()
      .withMessage('Completed date must be a valid ISO 8601 date'),
    body('notes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Notes must be less than 1000 characters')
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
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
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
    body('current')
      .optional()
      .isNumeric()
      .withMessage('Current value must be a number'),
    body('unit')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Unit must be less than 20 characters'),
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
    body('status')
      .optional()
      .isIn(['Active', 'Completed', 'Paused', 'Cancelled'])
      .withMessage('Invalid goal status')
  ],
  
  update: [
    param('id').isMongoId().withMessage('Invalid goal ID'),
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('target')
      .optional()
      .isNumeric()
      .withMessage('Target must be a number'),
    body('current')
      .optional()
      .isNumeric()
      .withMessage('Current value must be a number'),
    body('status')
      .optional()
      .isIn(['Active', 'Completed', 'Paused', 'Cancelled'])
      .withMessage('Invalid goal status')
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

// Bulk operations validation
const bulkValidation = {
  bulkUpdate: [
    body('operation')
      .isIn(['archive', 'restore', 'update', 'delete'])
      .withMessage('Invalid bulk operation'),
    body('contactIds')
      .isArray({ min: 1 })
      .withMessage('Contact IDs array is required and must not be empty'),
    body('contactIds.*')
      .isMongoId()
      .withMessage('Each contact ID must be a valid MongoDB ID'),
    body('updateData')
      .if(body('operation').equals('update'))
      .notEmpty()
      .withMessage('Update data is required for update operation')
  ],
  
  bulkImport: [
    body('contacts')
      .isArray({ min: 1 })
      .withMessage('Contacts array is required and must not be empty'),
    body('skipDuplicates')
      .optional()
      .isBoolean()
      .withMessage('Skip duplicates must be true or false')
  ]
};

// Analytics validation
const analyticsValidation = {
  track: [
    body('action')
      .isIn([
        'contact_added', 'interaction_logged', 'interview_scheduled', 
        'follow_up_completed', 'document_created', 'task_completed', 'goal_updated'
      ])
      .withMessage('Invalid analytics action'),
    body('date')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format')
  ]
};

// Search validation
const searchValidation = {
  global: [
    query('q')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Search query must be between 2 and 100 characters')
      .escape(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ]
};

// File upload validation
const fileValidation = {
  upload: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('File name must be between 1 and 255 characters'),
    body('type')
      .optional()
      .isIn(['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'gif'])
      .withMessage('Invalid file type'),
    body('size')
      .optional()
      .isInt({ min: 1, max: 10485760 }) // 10MB max
      .withMessage('File size must be between 1 byte and 10MB')
  ]
};

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
  },
  
  // Validate email domain
  isValidEmailDomain: (allowedDomains) => (value) => {
    if (!value) return true;
    
    const domain = value.split('@')[1];
    if (allowedDomains && !allowedDomains.includes(domain)) {
      throw new Error(`Email domain must be one of: ${allowedDomains.join(', ')}`);
    }
    return true;
  },
  
  // Validate unique array values
  hasUniqueValues: (value) => {
    if (!Array.isArray(value)) return true;
    
    const uniqueValues = [...new Set(value)];
    if (uniqueValues.length !== value.length) {
      throw new Error('Array values must be unique');
    }
    return true;
  }
};

// Sanitization helpers
const sanitizers = {
  // Remove HTML tags and encode special characters
  sanitizeText: (value) => {
    if (!value) return value;
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
    if (!value) return value;
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
  },
  
  // Sanitize tags array
  sanitizeTags: (tags) => {
    if (!Array.isArray(tags)) return [];
    
    return tags
      .map(tag => sanitizers.sanitizeText(tag))
      .filter(tag => tag && tag.length > 0)
      .slice(0, 20); // Limit to 20 tags
  },
  
  // Clean and validate date string
  normalizeDate: (value) => {
    if (!value) return value;
    
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return null;
      
      // Return in YYYY-MM-DD format
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }
};

// Validation middleware compositions
const validationMiddleware = {
  // Standard CRUD operations
  standardCreate: (entityValidation) => [
    ...entityValidation.create,
    handleValidationErrors
  ],
  
  standardUpdate: (entityValidation) => [
    ...entityValidation.update,
    handleValidationErrors
  ],
  
  standardDelete: [
    param('id').isMongoId().withMessage('Invalid ID'),
    handleValidationErrors
  ],
  
  // Pagination with search
  paginatedList: [
    ...paginationValidation,
    handleValidationErrors
  ],
  
  // Date range queries
  dateRangeQuery: [
    ...dateRangeValidation,
    handleValidationErrors
  ],
  
  // File upload
  fileUpload: [
    ...fileValidation.upload,
    handleValidationErrors
  ]
};

// Error response helpers
const validationHelpers = {
  // Create custom validation error
  createValidationError: (field, message, value = null) => {
    return {
      field,
      message,
      value,
      location: 'body'
    };
  },
  
  // Format validation errors for client
  formatErrors: (errors) => {
    return errors.map(error => ({
      field: error.param || error.path,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
  },
  
  // Check if request has validation errors
  hasValidationErrors: (req) => {
    const errors = validationResult(req);
    return !errors.isEmpty();
  },
  
  // Get validation errors from request
  getValidationErrors: (req) => {
    const errors = validationResult(req);
    return errors.array();
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
  bulkValidation,
  analyticsValidation,
  searchValidation,
  fileValidation,
  customValidators,
  sanitizers,
  validationMiddleware,
  validationHelpers
};
    body('networkingDate')
      .optional()
      .custom((value) => {
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          throw new Error('Date must be in YYYY-MM-DD format');
        }
        if (value && isNaN(Date.parse(value))) {
          throw new Error('Please provide a valid date');
        }
        return true;
      }),
    body('lastContactDate')
      .optional()
      .custom((value) => {
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          throw new Error('Date must be in YYYY-MM-DD format');
        }
        if (value && isNaN(Date.parse(value))) {
          throw new Error('Please provide a valid date');
        }
        return true;
      }),
    body('nextStepsDate')
      .optional()
      .custom((value) => {
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          throw new Error('Date must be in YYYY-MM-DD format');
        }
        if (value && isNaN(Date.parse(value))) {
          throw new Error('Please provide a valid date');
        }
        return true;
      }),
    body('nextSteps')
      .optional()
      .isIn([
        'Send Initial Outreach', 'Schedule Intro Call', 'Prepare for Upcoming Call',
        'Send Thank You Email', 'Send Resume', 'Send Follow-Up Email',
        'Schedule Follow-Up Call', '', null
      ])
      .withMessage('Invalid next steps value'),
    body('referred')
      .optional()
      .custom((value) => {
        if (value !== undefined && typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          throw new Error('Referred must be true or false');
        }
        return true;
      }),
    body('notes')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Notes must be less than 2000 characters'),
    body('tags')
      .optional()
      .custom((value) => {
        if (value !== undefined && !Array.isArray(value)) {
          throw new Error('Tags must be an array');
        }
        if (Array.isArray(value)) {
          for (const tag of value) {
            if (typeof tag !== 'string' || tag.trim().length === 0 || tag.trim().length > 50) {
              throw new Error('Each tag must be a string between 1 and 50 characters');
            }
          }
        }
        return true;
      })
  
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid contact ID'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters')
      .custom((value) => {
        if (value && !/^[a-zA-Z\s\-\.,']+$/.test(value)) {
          throw new Error('Name can only contain letters, spaces, hyphens, periods, commas, and apostrophes');
        }
        return true;
      }),
    body('firm')
      .optional()
      .trim()
      .notEmpty()
      .isLength({ min: 1, max: 100 })
      .withMessage('Firm name must be between 1 and 100 characters'),
    body('position')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Position must be less than 100 characters'),
    body('email')
      .optional()
      .custom((value) => {
        if (value && value.trim() !== '') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            throw new Error('Please provide a valid email address');
          }
        }
        return true;
      })
      .normalizeEmail(),
    body('phone')
      .optional()
      .custom((value) => {
        if (value && value.trim() !== '') {
          const phoneRegex = /^[\+]?[(]?[\d\s\-\(\)]{10,}$/;
          if (!phoneRegex.test(value)) {
            throw new Error('Please provide a valid phone number');
          }
        }
        return true;
      }),
    body('linkedin')
      .optional()
      .custom((value) => {
        if (value && value.trim() !== '') {
          try {
            new URL(value);
            if (!value.includes('linkedin.com')) {
              throw new Error('LinkedIn URL must be from linkedin.com');
            }
          } catch {
            throw new Error('LinkedIn URL must be a valid URL');
          }
        }
        return true;
      }),
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
    body('priority')
      .optional()
      .isIn(['High', 'Medium', 'Low'])
      .withMessage('Invalid priority level'),
    body('networkingDate')
      .optional()
      .custom((value) => {
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          throw new Error('Date must be in YYYY-MM-DD format');
        }
        if (value && isNaN(Date.parse(value))) {
          throw new Error('Please provide a valid date');
        }
        return true;
      }),
    body('lastContactDate')
      .optional()
      .custom((value) => {
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          throw new Error('Date must be in YYYY-MM-DD format');
        }
        if (value && isNaN(Date.parse(value))) {
          throw new Error('Please provide a valid date');
        }
        return true;
      }),
    body('nextStepsDate')
      .optional()
      .custom((value) => {
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          throw new Error('Date must be in YYYY-MM-DD format');
        }
        if (value && isNaN(Date.parse(value))) {
          throw new Error('Please provide a valid date');
        }
        return true;
      }),
    body('nextSteps')
      .optional()
      .isIn([
        'Send Initial Outreach', 'Schedule Intro Call', 'Prepare for Upcoming Call',
        'Send Thank You Email', 'Send Resume', 'Send Follow-Up Email',
        'Schedule Follow-Up Call', '', null
      ])
      .withMessage('Invalid next steps value'),
    body('referred')
      .optional()
      .custom((value) => {
        if (value !== undefined && typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          throw new Error('Referred must be true or false');
        }
        return true;
      }),
    body('notes')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Notes must be less than 2000 characters'),
    body('tags')
      .optional()
      .custom((value) => {
        if (value !== undefined && !Array.isArray(value)) {
          throw new Error('Tags must be an array');
        }
        if (Array.isArray(value)) {
          for (const tag of value) {
            if (typeof tag !== 'string' || tag.trim().length === 0 || tag.trim().length > 50) {
              throw new Error('Each tag must be a string between 1 and 50 characters');
            }
          }
        }
        return true;
      })
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
      .custom((value) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          throw new Error('Date must be in YYYY-MM-DD format');
        }
        if (isNaN(Date.parse(value))) {
          throw new Error('Please provide a valid date');
        }
        return true;
      }),
    body('time')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Time must be in HH:MM format'),
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
    body('nextSteps')
      .optional()
      .isIn([
        'Submit Application', 'Follow-Up on Application', 'Prepare for Upcoming Interview',
        'Send Thank You Email', 'Submit Additional Materials', 'Follow-Up on Status',
        'Schedule Next Round', 'Complete Case Study', 'Negotiate Offer', '', null
      ])
      .withMessage('Invalid next steps value'),
    body('nextStepsDate')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format'),
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
    body('priority')
      .optional()
      .isIn(['High', 'Medium', 'Low'])
      .withMessage('Invalid priority level'),
    body('nextSteps')
      .optional()
      .isIn([
        'Submit Application', 'Follow-Up on Application', 'Prepare for Upcoming Interview',
        'Send Thank You Email', 'Submit Additional Materials', 'Follow-Up on Status',
        'Schedule Next Round', 'Complete Case Study', 'Negotiate Offer', '', null
      ])
      .withMessage('Invalid next steps value'),
    body('notes')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Notes must be less than 2000 characters')
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
      .withMessage('Notes must be less than 1000 characters'),
    body('isTemplate')
      .optional()
      .isBoolean()
      .withMessage('isTemplate must be true or false')
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
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('content')
      .optional()
      .isLength({ max: 50000 })
      .withMessage('Content must be less than 50,000 characters'),
    body('notes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Notes must be less than 1000 characters'),
    body('isTemplate')
      .optional()
      .isBoolean()
      .withMessage('isTemplate must be true or false')
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
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('type')
      .isIn(['Contact', 'Interview', 'Application', 'Follow-up', 'Research', 'Other'])
      .withMessage('Invalid task type'),
    body('status')
      .optional()
      .isIn(['Pending', 'In Progress', 'Completed', 'Cancelled'])
      .withMessage('Invalid task status'),
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
    body('relatedContact')
      .optional()
      .isMongoId()
      .withMessage('Invalid contact ID'),
    body('relatedInterview')
      .optional()
      .isMongoId()
      .withMessage('Invalid interview ID'),
    body('relatedDocument')
      .optional()
      .isMongoId()
      .withMessage('Invalid document ID'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('notes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Notes must be less than 1000 characters')
  ]
    
