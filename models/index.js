const mongoose = require('mongoose');

// User Schema
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
    graduationYear: Number
  },
  refreshTokens: [String],
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date
}, {
  timestamps: true
});

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
  networkingDate: { type: String }, // YYYY-MM-DD format to match frontend
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
  referred: { type: Boolean, default: false },
  notes: { type: String },
  interactions: [{
    type: {
      type: String,
      enum: ['Call', 'Email', 'Meeting', 'Note'],
      required: true
    },
    title: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD format
    notes: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  isArchived: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Interview Schema - Matches your frontend exactly
const interviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  firm: { type: String, required: true, trim: true, index: true },
  position: { type: String, required: true, trim: true },
  group: { type: String, trim: true }, // TMT, Healthcare, FIG, etc.
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
  stageDate: { type: String }, // YYYY-MM-DD format to match frontend
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
  referralContactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  rounds: [{
    stage: {
      type: String,
      enum: ['Phone Screen', 'First Round', 'Second Round', 'Third Round', 'Case Study', 'Superday'],
      required: true
    },
    date: { type: String, required: true }, // YYYY-MM-DD format
    interviewer: { type: String },
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
    notes: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  isArchived: { type: Boolean, default: false }
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
  tags: [String], // Custom tags for organization
  notes: String,
  isTemplate: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  uploadDate: { type: String, default: () => new Date().toISOString().split('T')[0] }
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
    documentsCreated: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Create indexes for better performance
contactSchema.index({ userId: 1, firm: 1 });
contactSchema.index({ userId: 1, networkingStatus: 1 });
interviewSchema.index({ userId: 1, firm: 1 });
interviewSchema.index({ userId: 1, stage: 1 });
documentSchema.index({ userId: 1, type: 1 });
analyticsSchema.index({ userId: 1, date: 1 }, { unique: true });

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
