// Updated Contact Schema in server.js - replace the existing contactSchema

const contactSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  name: { type: String, required: true, trim: true },
  position: { type: String, trim: true },
  email: { 
    type: String, 
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: { type: String, trim: true },
  linkedin: { type: String, trim: true },
  firm: { type: String, required: true, trim: true },
  networkingStatus: { 
    type: String, 
    enum: [
      'To Be Contacted',
      'Initial Outreach Sent', 
      'Follow up Call Scheduled',
      'Intro Call Complete',
      'Follow up Email Sent',
      'Meeting Scheduled',
      'Regular Contact'
    ],
    default: 'To Be Contacted'
  },
  networkingDate: { type: String }, // Using String to match frontend date format
  nextSteps: { 
    type: String,
    enum: [
      'Send Initial Outreach',
      'Follow up Email',
      'Schedule Call',
      'Prepare for Upcoming Call',
      'Send Thank You Email',
      'Schedule Intro Call',
      'Send Resume',
      'Send Thank You Note',
      'Schedule Follow-up Meeting',
      'Send Proposal',
      'Prepare Interview Materials',
      'Complete Application',
      'No Action Required',
      '' // Allow empty
    ]
  },
  nextStepsDate: { type: String }, // Using String to match frontend date format
  referred: { type: Boolean, default: false },
  notes: { type: String },
  hasInterview: { type: Boolean, default: false },
  interviewStatus: { 
    type: String,
    enum: [
      'Not Applied',
      'Applied', 
      'Phone Screen',
      'First Round',
      'Second Round', 
      'Final Round',
      'Offer',
      'Rejected',
      'Add Interview',
      '' // Allow empty
    ]
  },
  interviewDate: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
