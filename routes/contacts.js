const express = require('express');
const { Contact } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { contactValidation, paginationValidation, handleValidationErrors } = require('../utils/validators');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all contacts with filtering, search, and pagination
router.get('/', paginationValidation, handleValidationErrors, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      networkingStatus, 
      firm, 
      group, 
      seniority,
      priority,
      referred,
      tags,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { userId: req.user.id, isArchived: { $ne: true } };
    
    // Search functionality
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { name: searchRegex },
        { firm: searchRegex },
        { position: searchRegex },
        { email: searchRegex },
        { notes: searchRegex }
      ];
    }
    
    // Filters
    if (networkingStatus) query.networkingStatus = networkingStatus;
    if (firm) query.firm = { $regex: firm, $options: 'i' };
    if (group) query.group = { $regex: group, $options: 'i' };
    if (seniority) query.seniority = seniority;
    if (priority) query.priority = priority;
    if (referred !== undefined) query.referred = referred === 'true';
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const contacts = await Contact.find(query)
      .sort(sort)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    // Get total count for pagination
    const total = await Contact.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      contacts,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems: total,
        itemsPerPage: Number(limit),
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('Contacts fetch error:', error);
    res.status(500).json({ 
      message: 'Error fetching contacts',
      code: 'CONTACTS_FETCH_ERROR'
    });
  }
});

// Get contact statistics and summaries
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get basic counts
    const [
      totalContacts,
      referredContacts,
      recentContacts,
      statusCounts,
      firmCounts,
      priorityCounts
    ] = await Promise.all([
      Contact.countDocuments({ userId, isArchived: { $ne: true } }),
      Contact.countDocuments({ userId, referred: true, isArchived: { $ne: true } }),
      Contact.countDocuments({ 
        userId, 
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        isArchived: { $ne: true }
      }),
      Contact.aggregate([
        { $match: { userId: userId, isArchived: { $ne: true } } },
        { $group: { _id: '$networkingStatus', count: { $sum: 1 } } }
      ]),
      Contact.aggregate([
        { $match: { userId: userId, isArchived: { $ne: true } } },
        { $group: { _id: '$firm', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Contact.aggregate([
        { $match: { userId: userId, isArchived: { $ne: true } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ])
    ]);

    // Get upcoming follow-ups
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const upcomingFollowUps = await Contact.find({
      userId,
      nextStepsDate: { $gte: today, $lte: nextWeek },
      nextSteps: { $ne: null, $ne: '' },
      isArchived: { $ne: true }
    }).select('name firm nextSteps nextStepsDate priority').limit(10);

    // Get contacts needing attention (no recent activity)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const needsAttention = await Contact.find({
      userId,
      $or: [
        { nextSteps: { $in: [null, ''] } },
        { nextStepsDate: { $lt: today } }
      ],
      lastContactDate: { $lt: weekAgo },
      isArchived: { $ne: true }
    }).select('name firm lastContactDate networkingStatus').limit(10);

    res.json({
      summary: {
        totalContacts,
        referredContacts,
        recentContacts,
        referralRate: totalContacts > 0 ? ((referredContacts / totalContacts) * 100).toFixed(1) : 0
      },
      distributions: {
        byStatus: statusCounts,
        byFirm: firmCounts,
        byPriority: priorityCounts
      },
      actionItems: {
        upcomingFollowUps,
        needsAttention
      }
    });
  } catch (error) {
    console.error('Contact stats error:', error);
    res.status(500).json({ 
      message: 'Error fetching contact statistics',
      code: 'CONTACT_STATS_ERROR'
    });
  }
});

// Create new contact
router.post('/', contactValidation.create, handleValidationErrors, async (req, res) => {
  try {
    // Clean and sanitize input data
    const cleanedData = {
      name: req.body.name?.trim(),
      firm: req.body.firm?.trim(),
      position: req.body.position?.trim() || '',
      group: req.body.group?.trim() || '',
      email: req.body.email?.trim().toLowerCase() || '',
      phone: req.body.phone?.trim() || '',
      linkedin: req.body.linkedin?.trim() || '',
      networkingStatus: req.body.networkingStatus || 'Not Yet Contacted',
      seniority: req.body.seniority || null,
      priority: req.body.priority || 'Medium',
      networkingDate: req.body.networkingDate || null,
      lastContactDate: req.body.lastContactDate || null,
      nextStepsDate: req.body.nextStepsDate || null,
      nextSteps: req.body.nextSteps || '',
      referred: Boolean(req.body.referred),
      notes: req.body.notes?.trim() || '',
      tags: Array.isArray(req.body.tags) ? req.body.tags.filter(tag => tag?.trim()) : [],
      userId: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Check for duplicate contacts (same name and firm)
    const existingContact = await Contact.findOne({
      userId: req.user.id,
      name: { $regex: new RegExp(`^${cleanedData.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      firm: { $regex: new RegExp(`^${cleanedData.firm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      isArchived: { $ne: true }
    });

    if (existingContact) {
      return res.status(409).json({
        message: 'A contact with this name at this firm already exists',
        code: 'DUPLICATE_CONTACT',
        existingContact: {
          id: existingContact._id,
          name: existingContact.name,
          firm: existingContact.firm
        }
      });
    }

    const contact = new Contact(cleanedData);
    await contact.save();
    
    res.status(201).json({ 
      message: 'Contact created successfully', 
      contact
    });
  } catch (error) {
    console.error('Contact creation error:', error);
    
    // Handle specific error types
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'A contact with this information already exists',
        code: 'DUPLICATE_CONTACT'
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      
      return res.status(400).json({
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        errors: validationErrors
      });
    }
    
    res.status(500).json({ 
      message: 'Error creating contact',
      code: 'CONTACT_CREATE_ERROR',
      details: error.message
    });
  }
});

// Get single contact by ID
router.get('/:id', async (req, res) => {
  try {
    const contact = await Contact.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!contact) {
      return res.status(404).json({ 
        message: 'Contact not found',
        code: 'CONTACT_NOT_FOUND'
      });
    }
    
    res.json({ contact });
  } catch (error) {
    console.error('Contact fetch error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid contact ID format',
        code: 'INVALID_CONTACT_ID'
      });
    }
    res.status(500).json({ 
      message: 'Error fetching contact',
      code: 'CONTACT_FETCH_ERROR'
    });
  }
});

// Update contact
router.put('/:id', contactValidation.update, handleValidationErrors, async (req, res) => {
  try {
    // Clean and sanitize input data
    const updateData = {};
    
    // Only include fields that are actually being updated
    const allowedFields = [
      'name', 'firm', 'position', 'group', 'email', 'phone', 'linkedin',
      'networkingStatus', 'seniority', 'priority', 'networkingDate',
      'lastContactDate', 'nextStepsDate', 'nextSteps', 'referred', 'notes', 'tags'
    ];
    
    allowedFields.forEach(field => {
      if (req.body.hasOwnProperty(field)) {
        if (field === 'tags') {
          updateData[field] = Array.isArray(req.body[field]) ? req.body[field].filter(tag => tag?.trim()) : [];
        } else if (field === 'referred') {
          updateData[field] = Boolean(req.body[field]);
        } else if (typeof req.body[field] === 'string') {
          updateData[field] = req.body[field].trim();
        } else {
          updateData[field] = req.body[field];
        }
      }
    });
    
    updateData.updatedAt = new Date();

    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!contact) {
      return res.status(404).json({ 
        message: 'Contact not found',
        code: 'CONTACT_NOT_FOUND'
      });
    }
    
    res.json({ 
      message: 'Contact updated successfully', 
      contact 
    });
  } catch (error) {
    console.error('Contact update error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid contact ID format',
        code: 'INVALID_CONTACT_ID'
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      
      return res.status(400).json({
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        errors: validationErrors
      });
    }
    
    res.status(500).json({ 
      message: 'Error updating contact',
      code: 'CONTACT_UPDATE_ERROR',
      details: error.message
    });
  }
});

// Delete contact (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isArchived: true, archivedAt: new Date() },
      { new: true }
    );
    
    if (!contact) {
      return res.status(404).json({ 
        message: 'Contact not found',
        code: 'CONTACT_NOT_FOUND'
      });
    }
    
    res.json({ 
      message: 'Contact archived successfully',
      code: 'CONTACT_ARCHIVED'
    });
  } catch (error) {
    console.error('Contact deletion error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid contact ID format',
        code: 'INVALID_CONTACT_ID'
      });
    }
    res.status(500).json({ 
      message: 'Error archiving contact',
      code: 'CONTACT_DELETE_ERROR'
    });
  }
});

// Restore archived contact
router.patch('/:id/restore', async (req, res) => {
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id, isArchived: true },
      { isArchived: false, $unset: { archivedAt: 1 }, updatedAt: new Date() },
      { new: true }
    );
    
    if (!contact) {
      return res.status(404).json({ 
        message: 'Archived contact not found',
        code: 'CONTACT_NOT_FOUND'
      });
    }
    
    res.json({ 
      message: 'Contact restored successfully', 
      contact 
    });
  } catch (error) {
    console.error('Contact restore error:', error);
    res.status(500).json({ 
      message: 'Error restoring contact',
      code: 'CONTACT_RESTORE_ERROR'
    });
  }
});

// Add interaction to contact
router.post('/:id/interactions', contactValidation.addInteraction, handleValidationErrors, async (req, res) => {
  try {
    const contact = await Contact.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!contact) {
      return res.status(404).json({ 
        message: 'Contact not found',
        code: 'CONTACT_NOT_FOUND'
      });
    }
    
    const interaction = {
      type: req.body.type,
      title: req.body.title?.trim(),
      date: req.body.date,
      time: req.body.time || '',
      duration: req.body.duration || null,
      notes: req.body.notes?.trim(),
      sentiment: req.body.sentiment || 'Neutral',
      createdAt: new Date()
    };
    
    contact.interactions.unshift(interaction);
    contact.updatedAt = new Date();
    
    // Update last contact date
    if (!contact.lastContactDate || req.body.date > contact.lastContactDate) {
      contact.lastContactDate = req.body.date;
    }
    
    await contact.save();
    
    res.status(201).json({ 
      message: 'Interaction added successfully', 
      interaction: contact.interactions[0]
    });
  } catch (error) {
    console.error('Interaction creation error:', error);
    res.status(500).json({ 
      message: 'Error adding interaction',
      code: 'INTERACTION_CREATE_ERROR'
    });
  }
});

// Update interaction
router.put('/:contactId/interactions/:interactionId', async (req, res) => {
  try {
    const contact = await Contact.findOne({ 
      _id: req.params.contactId, 
      userId: req.user.id 
    });
    
    if (!contact) {
      return res.status(404).json({ 
        message: 'Contact not found',
        code: 'CONTACT_NOT_FOUND'
      });
    }
    
    const interaction = contact.interactions.id(req.params.interactionId);
    if (!interaction) {
      return res.status(404).json({ 
        message: 'Interaction not found',
        code: 'INTERACTION_NOT_FOUND'
      });
    }
    
    // Update only provided fields
    const allowedFields = ['type', 'title', 'date', 'time', 'duration', 'notes', 'sentiment'];
    allowedFields.forEach(field => {
      if (req.body.hasOwnProperty(field)) {
        if (typeof req.body[field] === 'string') {
          interaction[field] = req.body[field].trim();
        } else {
          interaction[field] = req.body[field];
        }
      }
    });
    
    contact.updatedAt = new Date();
    await contact.save();
    
    res.json({ 
      message: 'Interaction updated successfully', 
      interaction 
    });
  } catch (error) {
    console.error('Interaction update error:', error);
    res.status(500).json({ 
      message: 'Error updating interaction',
      code: 'INTERACTION_UPDATE_ERROR'
    });
  }
});

// Delete interaction
router.delete('/:contactId/interactions/:interactionId', async (req, res) => {
  try {
    const contact = await Contact.findOne({ 
      _id: req.params.contactId, 
      userId: req.user.id 
    });
    
    if (!contact) {
      return res.status(404).json({ 
        message: 'Contact not found',
        code: 'CONTACT_NOT_FOUND'
      });
    }
    
    const interaction = contact.interactions.id(req.params.interactionId);
    if (!interaction) {
      return res.status(404).json({ 
        message: 'Interaction not found',
        code: 'INTERACTION_NOT_FOUND'
      });
    }
    
    interaction.remove();
    contact.updatedAt = new Date();
    await contact.save();
    
    res.json({ 
      message: 'Interaction deleted successfully',
      code: 'INTERACTION_DELETED'
    });
  } catch (error) {
    console.error('Interaction deletion error:', error);
    res.status(500).json({ 
      message: 'Error deleting interaction',
      code: 'INTERACTION_DELETE_ERROR'
    });
  }
});

// Bulk operations
router.post('/bulk', async (req, res) => {
  try {
    const { operation, contactIds, updateData } = req.body;
    
    if (!operation || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({
        message: 'Operation and contact IDs are required',
        code: 'MISSING_BULK_PARAMS'
      });
    }

    const userId = req.user.id;
    let result;
    
    switch (operation) {
      case 'archive':
        result = await Contact.updateMany(
          { _id: { $in: contactIds }, userId },
          { isArchived: true, archivedAt: new Date(), updatedAt: new Date() }
        );
        break;
        
      case 'restore':
        result = await Contact.updateMany(
          { _id: { $in: contactIds }, userId },
          { isArchived: false, $unset: { archivedAt: 1 }, updatedAt: new Date() }
        );
        break;
        
      case 'update':
        if (!updateData) {
          return res.status(400).json({
            message: 'Update data is required for update operation',
            code: 'MISSING_UPDATE_DATA'
          });
        }
        result = await Contact.updateMany(
          { _id: { $in: contactIds }, userId },
          { ...updateData, updatedAt: new Date() }
        );
        break;
        
      case 'delete':
        result = await Contact.deleteMany({ _id: { $in: contactIds }, userId });
        break;
        
      default:
        return res.status(400).json({
          message: 'Invalid operation',
          code: 'INVALID_BULK_OPERATION'
        });
    }
    
    res.json({ 
      message: `Bulk ${operation} completed successfully`,
      result: {
        matched: result.matchedCount || result.deletedCount,
        modified: result.modifiedCount || result.deletedCount
      }
    });
  } catch (error) {
    console.error('Bulk operation error:', error);
    res.status(500).json({ 
      message: 'Error performing bulk operation',
      code: 'BULK_OPERATION_ERROR'
    });
  }
});

// Export contacts
router.get('/export/csv', async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    const contacts = await Contact.find({ 
      userId: req.user.id, 
      isArchived: { $ne: true } 
    }).lean();

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = 'Name,Firm,Position,Group,Email,Phone,LinkedIn,Networking Status,Notes\n';
      const csvData = contacts.map(contact => 
        `"${contact.name}","${contact.firm}","${contact.position || ''}","${contact.group || ''}","${contact.email || ''}","${contact.phone || ''}","${contact.linkedin || ''}","${contact.networkingStatus}","${(contact.notes || '').replace(/"/g, '""')}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="contacts-${Date.now()}.csv"`);
      res.send(csvHeader + csvData);
    } else {
      // JSON export
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="contacts-${Date.now()}.json"`);
      res.json({
        exportDate: new Date().toISOString(),
        totalContacts: contacts.length,
        contacts
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      message: 'Error exporting contacts',
      code: 'EXPORT_ERROR'
    });
  }
});

// Import contacts
router.post('/import', async (req, res) => {
  try {
    const { contacts, skipDuplicates = true } = req.body;
    
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        message: 'Contacts array is required',
        code: 'MISSING_CONTACTS_DATA'
      });
    }

    const userId = req.user.id;
    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    for (const contactData of contacts) {
      try {
        // Check for required fields
        if (!contactData.name || !contactData.firm) {
          results.errors.push(`Skipped contact: Name and firm are required`);
          continue;
        }

        // Check for duplicates if skipDuplicates is true
        if (skipDuplicates) {
          const existing = await Contact.findOne({
            userId,
            name: { $regex: new RegExp(`^${contactData.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            firm: { $regex: new RegExp(`^${contactData.firm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            isArchived: { $ne: true }
          });

          if (existing) {
            results.skipped++;
            continue;
          }
        }

        // Create contact with cleaned data
        const cleanedContactData = {
          name: contactData.name?.trim(),
          firm: contactData.firm?.trim(),
          position: contactData.position?.trim() || '',
          group: contactData.group?.trim() || '',
          email: contactData.email?.trim().toLowerCase() || '',
          phone: contactData.phone?.trim() || '',
          linkedin: contactData.linkedin?.trim() || '',
          networkingStatus: contactData.networkingStatus || 'Not Yet Contacted',
          seniority: contactData.seniority || '',
          priority: contactData.priority || 'Medium',
          referred: Boolean(contactData.referred),
          notes: contactData.notes?.trim() || '',
          tags: Array.isArray(contactData.tags) ? contactData.tags.filter(tag => tag?.trim()) : [],
          userId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const contact = new Contact(cleanedContactData);
        await contact.save();
        results.imported++;
      } catch (error) {
        results.errors.push(`Error importing ${contactData.name}: ${error.message}`);
      }
    }

    res.json({
      message: 'Import completed',
      results
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ 
      message: 'Error importing contacts',
      code: 'IMPORT_ERROR'
    });
  }
});

module.exports = router;
