// routes/documents.js
const express = require('express');
const { Document } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { documentValidation, paginationValidation, handleValidationErrors } = require('../utils/validators');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all documents
router.get('/', paginationValidation, handleValidationErrors, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, type, tag } = req.query;
    
    const query = { userId: req.user.id, isArchived: false };
    
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { name: searchRegex },
        { notes: searchRegex },
        { associatedContacts: { $in: [searchRegex] } },
        { associatedFirms: { $in: [searchRegex] } },
        { tags: { $in: [searchRegex] } }
      ];
    }
    
    if (type) query.type = type;
    if (tag) query.tags = tag;

    const documents = await Document.find(query)
      .sort({ updatedAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Document.countDocuments(query);

    res.json({
      documents,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Documents fetch error:', error);
    res.status(500).json({ 
      message: 'Error fetching documents',
      code: 'DOCUMENTS_FETCH_ERROR'
    });
  }
});

// Create new document
router.post('/', documentValidation.create, handleValidationErrors, async (req, res) => {
  try {
    const documentData = { ...req.body, userId: req.user.id };
    const document = new Document(documentData);
    await document.save();
    
    res.status(201).json({ 
      message: 'Document created successfully', 
      document 
    });
  } catch (error) {
    console.error('Document creation error:', error);
    res.status(500).json({ 
      message: 'Error creating document',
      code: 'DOCUMENT_CREATE_ERROR'
    });
  }
});

// Get single document
router.get('/:id', async (req, res) => {
  try {
    const document = await Document.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!document) {
      return res.status(404).json({ 
        message: 'Document not found',
        code: 'DOCUMENT_NOT_FOUND'
      });
    }
    
    res.json({ document });
  } catch (error) {
    console.error('Document fetch error:', error);
    res.status(500).json({ 
      message: 'Error fetching document',
      code: 'DOCUMENT_FETCH_ERROR'
    });
  }
});

// Update document
router.put('/:id', documentValidation.update, handleValidationErrors, async (req, res) => {
  try {
    const document = await Document.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    
    if (!document) {
      return res.status(404).json({ 
        message: 'Document not found',
        code: 'DOCUMENT_NOT_FOUND'
      });
    }
    
    res.json({ 
      message: 'Document updated successfully', 
      document 
    });
  } catch (error) {
    console.error('Document update error:', error);
    res.status(500).json({ 
      message: 'Error updating document',
      code: 'DOCUMENT_UPDATE_ERROR'
    });
  }
});

// Delete document
router.delete('/:id', async (req, res) => {
  try {
    const document = await Document.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isArchived: true, archivedAt: new Date() },
      { new: true }
    );
    
    if (!document) {
      return res.status(404).json({ 
        message: 'Document not found',
        code: 'DOCUMENT_NOT_FOUND'
      });
    }
    
    res.json({ 
      message: 'Document archived successfully',
      code: 'DOCUMENT_ARCHIVED'
    });
  } catch (error) {
    console.error('Document deletion error:', error);
    res.status(500).json({ 
      message: 'Error archiving document',
      code: 'DOCUMENT_DELETE_ERROR'
    });
  }
});

module.exports = router;
