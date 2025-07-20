const { body, param, query, validationResult } = require('express-validator');

// Enhanced validation with better error messages
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
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

// Contact validation - Fixed and improved
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
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 100 })
      .withMessage('Position must be less than 100 characters'),
    body('email')
      .optional({ nullable: true, checkFalsy: true })
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('phone')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (value && !/^[\+]?[(]?[\d\s\-\(\)]{10,}$/.test(value)) {
          throw new Error('Please provide a valid phone number');
        }
        return true;
      }),
    body('linkedin')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (value && !/^https?:\/\/.+/.test(value)) {
          throw new Error('LinkedIn URL must be a valid URL');
        }
        return true;
      }),
    body('group')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 50 })
      .withMessage('Group must be less than 50 characters'),
    body('networkingStatus')
      .optional({ nullable: true, checkFalsy: true })
      .isIn([
        'Not Yet Contacted', 'Initial Outreach Sent', 'Intro Call Scheduled',
        'Intro Call Complete', 'Follow-Up Email Sent', 'Follow-Up Call Scheduled',
        'Follow-Up Call Complete', 'Regular Contact', '', null 
      ])
      .withMessage('Invalid networking status'),
    body('priority')
      .optional()
      .isIn(['High', 'Medium', 'Low'])
      .withMessage('Invalid priority level'),
    body('networkingDate')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601()
      .withMessage('Networking date must be a valid date'),
    body('lastContactDate')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601()
      .withMessage('Last contact date must be a valid date'),
    body('nextStepsDate')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601()
      .withMessage('Next steps date must be a valid date'),
    body('nextSteps')
      .optional({ nullable: true, checkFalsy: true })
      .isIn([
        'Send Initial Outreach', 'Schedule Intro Call', 'Prepare for Upcoming Call',
        'Send Thank You Email', 'Send Resume', 'Send Follow-Up Email',
        'Schedule Follow-Up Call', '', null
      ])
      .withMessage('Invalid next steps value'),
    body('referred')
      .optional()
      .isBoolean()
      .withMessage('Referred must be true or false'),
    body('notes')
      .optional({ nullable: true, checkFalsy: true })
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
    param('id')
      .custom((value) => {
        if (!/^[0-9a-fA-F]{24}$/.test(value)) {
          throw new Error('Invalid contact ID');
        }
        return true;
      }),
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
    body('position')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 100 })
      .withMessage('Position must be less than 100 characters'),
    body('email')
      .optional({ nullable: true, checkFalsy: true })
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('phone')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (value && !/^[\+]?[(]?[\d\s\-\(\)]{10,}$/.test(value)) {
          throw new Error('Please provide a valid phone number');
        }
        return true;
      }),
    body('linkedin')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (value && !/^https?:\/\/.+/.test(value)) {
          throw new Error('LinkedIn URL must be a valid URL');
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
    body('priority')
      .optional()
      .isIn(['High', 'Medium', 'Low'])
      .withMessage('Invalid priority level'),
    body('referred')
      .optional()
      .isBoolean()
      .withMessage('Referred must be true or false'),
    body('notes')
      .optional({ nullable: true, checkFalsy: true })
      .isLength({ max: 2000 })
      .withMessage('Notes must be less than 2000 characters')
  ],
  
  addInteraction: [
    param('id')
      .custom((value) => {
        if (!/^[0-9a-fA-F]{24}$/.test(value)) {
          throw new Error('Invalid contact ID');
        }
        return true;
      }),
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
      .isISO8601()
      .withMessage('Date must be a valid date'),
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
      .isISO8601()
      .withMessage('Stage date must be a valid date'),
    body('applicationDate')
      .optional()
      .isISO8601()
      .withMessage('Application date must be a valid date'),
    body('deadline')
      .optional()
      .isISO8601()
      .withMessage('Deadline must be a valid date'),
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
      .isISO8601()
      .withMessage('Next steps date must be a valid date'),
    body('notes')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Notes must be less than 2000 characters'),
    body('referralContactId')
      .optional()
      .custom((value) => {
        if (value && !/^[0-9a-fA-F]{24}$/.test(value)) {
          throw new Error('Invalid referral contact ID');
        }
        return true;
      })
  ],
  
  update: [
    param('id').custom((value) => {
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error('Invalid interview ID');
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
    param('id').custom((value) => {
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error('Invalid interview ID');
      }
      return true;
    }),
    body('stage')
      .isIn(['Phone Screen', 'First Round', 'Second Round', 'Third Round', 'Case Study', 'Superday', 'Final Round'])
      .withMessage('Invalid interview round stage'),
    body('date')
      .isISO8601()
      .withMessage('Date must be a valid date'),
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
    param('id').custom((value) => {
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error('Invalid document ID');
      }
      return true;
    }),
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
      .isISO8601()
      .withMessage('Due date must be a valid date'),
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
      .custom((value) => {
        if (value && !/^[0-9a-fA-F]{24}$/.test(value)) {
          throw new Error('Invalid contact ID');
        }
        return true;
      }),
    body('relatedInterview')
      .optional()
      .custom((value) => {
        if (value && !/^[0-9a-fA-F]{24}$/.test(value)) {
          throw new Error('Invalid interview ID');
        }
        return true;
      }),
    body('relatedDocument')
      .optional()
      .custom((value) => {
        if (value && !/^[0-9a-fA-F]{24}$/.test(value)) {
          throw new Error('Invalid document ID');
        }
        return true;
      }),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('notes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Notes must be less than 1000 characters')
  ],
  
  update: [
    param('id').custom((value) => {
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error('Invalid task ID');
      }
      return true;
    }),
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
      .isISO8601()
      .withMessage('Start date must be a valid date'),
    body('endDate')
      .isISO8601()
      .withMessage('End date must be a valid date')
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
];

const dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
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
      .custom((value) => {
        if (!/^[0-9a-fA-F]{24}$/.test(value)) {
          throw new Error('Each contact ID must be a valid MongoDB ID');
        }
        return true;
      }),
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
      .isISO8601()
      .withMessage('Date must be a valid date')
  ]
};

// Search validation
const searchValidation = {
  global: [
    query('q')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Search query must be between 2 and 100 characters'),
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
    param('id').custom((value) => {
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error('Invalid ID');
      }
      return true;
    }),
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
