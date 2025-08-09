const mongoose = require('mongoose');

// User Schema with enhanced login tracking
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
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
    firstName: String,
    lastName: String,
    university: String,
    graduationYear: Number,
    phoneNumber: String,
    linkedinUrl: String
  },
  preferences: {
    theme: { type: String, default: 'light' },
    notifications: { type: Boolean, default: true },
    timezone: { type: String, default: 'UTC' }
  },
  refreshTokens: [String],
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  emailVerified: { type: Boolean, default: false },
  passwordResetToken: String,
  passwordResetExpires: Date,
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Instance methods for login attempt tracking
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + 2 * 60 * 60 * 1000 // 2 hours
    };
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    }
  });
};

// Contact Schema - Matches your frontend exactly
const contactSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  name: { type: String, required: true, trim: true },
  position: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  linkedin: { type: String, trim: true },
  firm: { type: String, required: true, trim: true, index: true },
  group: { type: String, trim: true }, // TMT, Healthcare, FIG, etc.
  seniority: {
    type: String,
    enum: ['Analyst', 'Associate', 'VP', 'Director', 'MD', 'Other'],
    default: 'Other'
  },
  networkingStatus: { 
    type: String, 
    enum: [
      'Not Yet Contacted',
      'Initial Outreach Sent', 
      'Intro Call Scheduled',
      'Intro Call Complete',
      'Follow-Up Email Sent',
      'Follow-Up Call Scheduled',
      'Follow-Up Call Complete',
      'Regular Contact'
    ],
    default: 'Not Yet Contacted'
  },
  networkingDate: { type: String }, // YYYY-MM-DD format to match frontend
  lastContactDate: { type: String }, // YYYY-MM-DD format
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
  nextStepsDate: { type: String }, // YYYY-MM-DD format to match frontend
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  referred: { type: Boolean, default: false },
  notes: { type: String },
  tags: [String],
  interactions: [{
    type: {
      type: String,
      enum: ['Call', 'Email', 'Meeting', 'Note', 'Coffee Chat', 'Event'],
      required: true
    },
    title: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD format
    duration: { type: Number }, // minutes
    notes: { type: String, required: true },
    sentiment: {
      type: String,
      enum: ['Positive', 'Neutral', 'Negative'],
      default: 'Neutral'
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
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  firm: { type: String, required: true, trim: true, index: true },
  position: { type: String, required: true, trim: true },
  group: { type: String, trim: true }, // TMT, Healthcare, FIG, etc.
  office: { type: String, trim: true },
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
      'Final Round',
      'Offer Received',
      'Rejected',
      'Withdrawn',
      '', null
    ]
  },
  stageDate: { type: String }, // YYYY-MM-DD format to match frontend
  applicationDate: { type: String }, // YYYY-MM-DD format
  deadline: { type: String }, // YYYY-MM-DD format
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
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
  nextStepsDate: { type: String }, // YYYY-MM-DD format to match frontend
  notes: { type: String },
  referralContactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null },
  rounds: [{
    stage: {
      type: String,
      enum: ['Phone Screen', 'First Round', 'Second Round', 'Third Round', 'Case Study', 'Superday', 'Final Round'],
      required: true
    },
    date: { type: String, required: true }, // YYYY-MM-DD format
    time: { type: String }, // HH:MM format
    duration: { type: Number }, // minutes
    interviewer: { type: String },
    format: {
      type: String,
      enum: ['Phone', 'Video', 'In-Person', 'Assessment', 'Case Study'],
      default: 'Video'
    },
    outcome: {
      type: String,
      enum: ['Pending', 'Passed', 'Failed', 'Cancelled', 'Rescheduled'],
      default: 'Pending'
    },
    notes: { type: String },
    rating: { type: Number, min: 1, max: 5 },
    createdAt: { type: Date, default: Date.now }
  }],
  isArchived: { type: Boolean, default: false },
  archivedAt: Date
}, {
  timestamps: true
});

// Document Schema - Matches your frontend exactly
const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: [
      'Resume',
      'Cover Letter',
      'Email Template',
      'Thank You Email',
      'Follow-up Template',
      'Meeting Notes',
      'Referral Letter',
      'Case Study',
      'Presentation',
      'Research',
      'Other'
    ],
    required: true
  },
  description: { type: String, trim: true },
  content: { type: String }, // Document content
  fileData: {
    name: String,
    size: Number,
    type: String,
    url: String // File URL if uploaded to cloud storage
  },
  associatedContacts: [String], // Array of contact names
  associatedFirms: [String], // Array of firm names
  tags: [String], // Custom tags for organization
  notes: String,
  isTemplate: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  archivedAt: Date,
  uploadDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  lastModified: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Task Schema
const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  type: {
    type: String,
    enum: ['Contact', 'Interview', 'Application', 'Follow-up', 'Research', 'Other'],
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  dueDate: { type: String }, // YYYY-MM-DD format
  dueTime: { type: String }, // HH:MM format
  estimatedDuration: { type: Number }, // minutes
  actualDuration: { type: Number }, // minutes
  completedAt: { type: Date },
  relatedContact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  relatedInterview: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' },
  relatedDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  tags: [String],
  notes: { type: String },
  isArchived: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Goal Schema
const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category: {
    type: String,
    enum: ['Networking', 'Applications', 'Interviews', 'Learning', 'Personal'],
    required: true
  },
  type: {
    type: String,
    enum: ['Count', 'Percentage', 'Binary'],
    default: 'Count'
  },
  target: { type: Number, required: true },
  current: { type: Number, default: 0 },
  unit: { type: String, default: '' },
  timeframe: {
    type: String,
    enum: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Custom'],
    required: true
  },
  startDate: { type: String, required: true }, // YYYY-MM-DD format
  endDate: { type: String, required: true }, // YYYY-MM-DD format
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Paused', 'Cancelled'],
    default: 'Active'
  },
  completedAt: { type: Date },
  isArchived: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Analytics Schema - Simple version for tracking
const analyticsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  date: { type: String, required: true }, // YYYY-MM-DD format
  metrics: {
    contactsAdded: { type: Number, default: 0 },
    interactionsLogged: { type: Number, default: 0 },
    interviewsScheduled: { type: Number, default: 0 },
    followUpsCompleted: { type: Number, default: 0 },
    documentsCreated: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    goalsProgress: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Create indexes for better performance
contactSchema.index({ userId: 1, firm: 1 });
contactSchema.index({ userId: 1, networkingStatus: 1 });
contactSchema.index({ userId: 1, nextStepsDate: 1 });
contactSchema.index({ userId: 1, priority: 1 });

interviewSchema.index({ userId: 1, firm: 1 });
interviewSchema.index({ userId: 1, stage: 1 });
interviewSchema.index({ userId: 1, stageDate: 1 });
interviewSchema.index({ userId: 1, priority: 1 });

documentSchema.index({ userId: 1, type: 1 });
documentSchema.index({ userId: 1, tags: 1 });

taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, priority: 1 });

goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, timeframe: 1 });

analyticsSchema.index({ userId: 1, date: 1 }, { unique: true });

// Create models
const User = mongoose.model('User', userSchema);
const Contact = mongoose.model('Contact', contactSchema);
const Interview = mongoose.model('Interview', interviewSchema);
const Document = mongoose.model('Document', documentSchema);
const Task = mongoose.model('Task', taskSchema);
const Goal = mongoose.model('Goal', goalSchema);
const Analytics = mongoose.model('Analytics', analyticsSchema);

// Export models
module.exports = {
  User,
  Contact,
  Interview,
  Document,
  Task,
  Goal,
  Analytics
};
