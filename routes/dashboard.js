const express = require('express');
const mongoose = require('mongoose');
const { Contact, Interview, Document } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get basic counts
    const [
      totalContacts,
      totalInterviews,
      totalDocuments,
      contactsWithReferrals,
      activeInterviews,
      offersReceived
    ] = await Promise.all([
      Contact.countDocuments({ userId, isArchived: { $ne: true } }),
      Interview.countDocuments({ userId, isArchived: { $ne: true } }),
      Document.countDocuments({ userId, isArchived: { $ne: true } }),
      Contact.countDocuments({ userId, referred: true, isArchived: { $ne: true } }),
      Interview.countDocuments({ 
        userId, 
        stage: { $nin: ['Offer Received', 'Rejected', 'Withdrawn'] },
        isArchived: { $ne: true }
      }),
      Interview.countDocuments({ userId, stage: 'Offer Received', isArchived: { $ne: true } })
    ]);

    // Get unique firms
    const uniqueFirms = await Contact.distinct('firm', { userId, isArchived: { $ne: true } });
    
    // Calculate success rates
    const successRate = totalInterviews > 0 ? 
      ((offersReceived / totalInterviews) * 100).toFixed(1) : 0;
    
    const referralPercentage = totalContacts > 0 ? 
      ((contactsWithReferrals / totalContacts) * 100).toFixed(1) : 0;

    // Application success rate calculation
    const appliedInterviews = await Interview.countDocuments({ 
      userId, 
      stage: { $nin: ['Not Yet Applied'] },
      isArchived: { $ne: true }
    });
    const interviewedCount = await Interview.countDocuments({ 
      userId,
      stage: { $in: ['Phone Screen', 'First Round', 'Second Round', 'Third Round', 'Case Study', 'Superday', 'Offer Received'] },
      isArchived: { $ne: true }
    });
    const applicationSuccessRate = appliedInterviews > 0 ? 
      ((interviewedCount / appliedInterviews) * 100).toFixed(1) : 0;

    // Get recent activity
    const recentContacts = await Contact.find({ userId, isArchived: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name firm position group createdAt');

    const recentInterviews = await Interview.find({ userId, isArchived: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firm position stage stageDate createdAt')
      .populate('referralContactId', 'name');

    // Get upcoming tasks (next steps due soon)
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const [upcomingContactTasks, upcomingInterviewTasks] = await Promise.all([
      Contact.find({ 
        userId, 
        nextStepsDate: { $gte: today, $lte: nextWeek },
        nextSteps: { $ne: null, $ne: '' },
        isArchived: { $ne: true }
      }).select('name firm nextSteps nextStepsDate').limit(10),
      Interview.find({ 
        userId, 
        nextStepsDate: { $gte: today, $lte: nextWeek },
        nextSteps: { $ne: null, $ne: '' },
        isArchived: { $ne: true }
      }).select('firm position nextSteps nextStepsDate').limit(10)
    ]);

    // Get networking funnel data
    const networkingFunnel = await Contact.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), isArchived: { $ne: true } } },
      { $group: { _id: '$networkingStatus', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Get interview funnel data
    const interviewFunnel = await Interview.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), isArchived: { $ne: true } } },
      { $group: { _id: '$stage', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Get contacts needing follow-up
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const followUpContacts = await Contact.find({
      userId,
      $or: [
        { nextSteps: { $in: [null, ''] } },
        { nextStepsDate: { $lt: today } }
      ],
      networkingDate: { $lt: sevenDaysAgo },
      isArchived: { $ne: true }
    }).select('name firm position networkingDate').limit(10);

    // Add days since last contact calculation
    const followUpContactsWithDays = followUpContacts.map(contact => {
      const daysSince = Math.floor((new Date() - new Date(contact.networkingDate)) / (1000 * 60 * 60 * 24));
      return {
        ...contact.toObject(),
        daysSinceLastContact: daysSince
      };
    });

    res.json({
      stats: {
        totalContacts,
        totalInterviews,
        totalDocuments,
        uniqueFirms: uniqueFirms.length,
        referrals: contactsWithReferrals,
        activeInterviews,
        successRate: parseFloat(successRate),
        referralPercentage: parseFloat(referralPercentage),
        applicationSuccessRate: parseFloat(applicationSuccessRate)
      },
      funnels: {
        networking: networkingFunnel,
        interview: interviewFunnel
      },
      recent: {
        contacts: recentContacts,
        interviews: recentInterviews
      },
      tasks: {
        upcoming: [...upcomingContactTasks, ...upcomingInterviewTasks],
        followUps: followUpContactsWithDays
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      message: 'Error fetching dashboard statistics',
      code: 'DASHBOARD_STATS_ERROR'
    });
  }
});

module.exports = router;
