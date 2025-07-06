const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  profile: {
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    university: String,
    graduationYear: Number,
    phoneNumber: String,
    linkedinUrl: String
  },
  refreshTokens: [String],
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Create indexes for user schema
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ status: 1 });

// Contact Schema - Matches your frontend exactly
const contactSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    ref: 'User', 
    index: true 
  },
  name: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 100
  },
  position: { 
    type: String, 
    trim: true,
    maxlength: 100
  },
  email: { 
    type: String, 
    lowercase: true, 
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  phone: { 
    type: String, 
    trim: true,
    maxlength: 20
  },
  linkedin: { 
    type: String, 
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'LinkedIn URL must be a valid URL'
    }
  },
  firm: { 
    type: String, 
    required: true, 
    trim: true, 
    index: true,
    maxlength: 100
  },
  group: { 
    type: String, 
    trim: true,
    maxlength: 50
  }, // TMT, Healthcare, FIG, etc.
  networkingStatus: { 
    type: String, 
    enum: [
      'Not Yet Contacted',
      'Initial Outreach Sent', 
      'Intro Call Scheduled',
      'Intro Call Complete',
      'Follow-Up Email Sent',
      'Follow-Up Call Scheduled',
      'Follow-Up Call Complete'
    ],
    default: 'Not Yet Contacted'
  },
  networkingDate: { 
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: 'Date must be in YYYY-MM-DD format'
    }
  }, // YYYY-MM-DD format to match frontend
  nextSteps: { 
    type: String,
    enum: [
      'Send Initial Outreach',
      'Schedule Intro Call',
      'Prepare for Upcoming Call',
      'Send Thank You Email',
      'Send Resume',
      'Send Follow-Up Email',
      'Schedule Follow-Up Call',
      '', null
    ]
  },
  nextStepsDate: { 
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: 'Date must be in YYYY-MM-DD format'
    }
  }, // YYYY-MM-DD format to match frontend
  referred: { type: Boolean, default: false },
  notes: { 
    type: String,
    maxlength: 2000
  },
  interactions: [{
    type: {
      type: String,
      enum: ['Call', 'Email', 'Meeting', 'Note'],
      required: true
    },
    title: { 
      type: String, 
      required: true,
      maxlength: 200
    },
    date: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v) {
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
        message: 'Date must be in YYYY-MM-DD format'
      }
    }, // YYYY-MM-DD format
    notes: { 
      type: String, 
      required: true,
      maxlength: 2000
    },
    createdAt: { type: Date, default: Date.now }
  }],
  isArchived: { type: Boolean, default: false },
  archivedAt: Date
}, {
  timestamps: true
});

// Interview Schema - Matches your frontend exactly
const interviewSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    ref: 'User', 
    index: true 
  },
  firm: { 
    type: String, 
    required: true, 
    trim: true, 
    index: true,
    maxlength: 100
  },
  position: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 100
  },
  group: { 
    type: String, 
    trim: true,
    maxlength: 50
  }, // TMT, Healthcare, FIG, etc.
  stage: { 
    type: String,
    enum: [
      'Not Yet Applied',
      'Applied', 
      'Phone Screen',
      'First Round',
      'Second Round',
      'Third Round',
      'Case Study',
      'Superday',
      'Offer Received',
      'Rejected',
      'Withdrawn'
    ],
    default: 'Not Yet Applied'
  },
  stageDate: { 
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: 'Date must be in YYYY-MM-DD format'
    }
  }, // YYYY-MM-DD format to match frontend
  nextSteps: { 
    type: String,
    enum: [
      'Submit Application',
      'Follow-Up on Application',
      'Prepare for Upcoming Interview',
      'Send Thank You Email',
      'Submit Additional Materials',
      'Follow-Up on Status',
      'Schedule Next Round',
      'Complete Case Study',
      'Negotiate Offer',
      '', null
    ]
  },
  nextStepsDate: { 
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: 'Date must be in YYYY-MM-DD format'
    }
  }, // YYYY-MM-DD format to match frontend
  notes: { 
    type: String,
    maxlength: 2000
  },
  referralContactId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Contact' 
  },
  rounds: [{
    stage: {
      type: String,
      enum: ['Phone Screen', 'First Round', 'Second Round', 'Third Round', 'Case Study', 'Superday'],
      required: true
    },
    date: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v) {
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
        message: 'Date must be in YYYY-MM-DD format'
      }
    }, // YYYY-MM-DD format
    interviewer: { 
      type: String,
      maxlength: 100
    },
    format: {
      type: String,
      enum: ['Phone', 'Video', 'In-Person', 'Assessment'],
      default: 'Video'
    },
    outcome: {
      type: String,
      enum: ['Pending', 'Passed', 'Failed', 'Cancelled'],
      default: 'Pending'
    },
    notes: { 
      type: String,
      maxlength: 2000
    },
    createdAt: { type: Date, default: Date.now }
  }],
  isArchived: { type: Boolean, default: false },
  archivedAt: Date
}, {
  timestamps: true
});

// Document Schema - Matches your frontend exactly
const documentSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    ref: 'User', 
    index: true 
  },
  name: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    enum: [
      'Resume',
      'Email Template',
      'Thank You Email',
      'Meeting Notes',
      'Referral Letter',
      'Cover Letter',
      'Follow-up Template',
      'Other'
    ],
    required: true
  },
  fileData: {
    name: String,
    size: Number,
    type: String,
    content: String // For storing file content or reference
  },
  associatedContacts: [String], // Array of contact names
  associatedFirms: [String], // Array of firm names
  tags: [{
    type: String,
    maxlength: 50
  }], // Custom tags for organization
  notes: {
    type: String,
    maxlength: 1000
  },
  isTemplate: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  archivedAt: Date,
  uploadDate: { 
    type: String, 
    default: () => new Date().toISOString().split('T')[0],
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: 'Date must be in YYYY-MM-DD format'
    }
  }
}, {
  timestamps: true
});

// Analytics Schema - Simple version for tracking
const analyticsSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    ref: 'User', 
    index: true 
  },
  date: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: 'Date must be in YYYY-MM-DD format'
    }
  }, // YYYY-MM-DD format
  metrics: {
    contactsAdded: { type: Number, default: 0 },
    interactionsLogged: { type: Number, default: 0 },
    interviewsScheduled: { type: Number, default: 0 },
    followUpsCompleted: { type: Number, default: 0 },
    documentsCreated: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Create compound indexes for better performance
contactSchema.index({ userId: 1, firm: 1 });
contactSchema.index({ userId: 1, networkingStatus: 1 });
contactSchema.index({ userId: 1, nextStepsDate: 1 });
contactSchema.index({ userId: 1, isArchived: 1 });

interviewSchema.index({ userId: 1, firm: 1 });
interviewSchema.index({ userId: 1, stage: 1 });
interviewSchema.index({ userId: 1, nextStepsDate: 1 });
interviewSchema.index({ userId: 1, isArchived: 1 });

documentSchema.index({ userId: 1, type: 1 });
documentSchema.index({ userId: 1, isArchived: 1 });

analyticsSchema.index({ userId: 1, date: 1 }, { unique: true });

// Add pre-save middleware for validation
userSchema.pre('save', function(next) {
  // Convert email to lowercase
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
});

contactSchema.pre('save', function(next) {
  // Convert email to lowercase
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
});

// Create models
const User = mongoose.model('User', userSchema);
const Contact = mongoose.model('Contact', contactSchema);
const Interview = mongoose.model('Interview', interviewSchema);
const Document = mongoose.model('Document', documentSchema);
const Analytics = mongoose.model('Analytics', analyticsSchema);

// Export models
module.exports = {
  User,
  Contact,
  Interview,
  Document,
  Analytics
};
