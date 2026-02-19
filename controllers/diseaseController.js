import DiseaseData from '../models/diseaseModel.js';
import { validationResult } from 'express-validator';
import XLSX from 'xlsx';

// Helper Methods

// Helper function to convert MongoDB Map to plain object for JSON serialization
const serializeAdditionalFields = (entry) => {
  let additionalObj = {};
  if (entry.additional && typeof entry.additional.forEach === 'function') {
    entry.additional.forEach((value, key) => {
      additionalObj[key] = value;
    });
  } else if (entry.additional) {
    additionalObj = entry.additional;
  }
  return additionalObj;
};

// Improved query builder that properly combines search and filters
export const buildCombinedQuery = (searchParams) => {
  const { search, field, disease, autoantibody, autoantigen, epitope, uniprotId, diseaseAssociation, affinity, sensitivity, diagnosticMarker, associationWithDiseaseActivity, pathogenesisInvolvement, reference, databaseAccessionNumbers, synonym, screening, confirmation, monitoring, positivePredictiveValues, negativePredictiveValues, crossReactivityPatterns, referenceRangesAndCutoffValues, type, priority } = searchParams;
  let searchConditions = [];
  let filterConditions = [];

  // Handle text search
  if (search && search.trim()) {
    // Escape regex special characters but preserve Unicode characters like ö, é, etc.
    // Only escape characters that have special meaning in regex, not Unicode characters
    const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedSearch, 'i');
    
    if (field === 'all') {
      // Enhanced Ro52/SSA relationship handling in search
      const searchTerms = [];
      if (search.trim().toLowerCase().includes('ro52') || 
          search.trim().toLowerCase().includes('anti-ro52') ||
          search.trim().toLowerCase().includes('ro/ssa') ||
          search.trim().toLowerCase().includes('ro (ssa)') ||
          search.trim().toLowerCase().includes('ro')) {
        // For Ro52/Anti-Ro52/Ro searches, include SSA variations
        searchTerms.push(
          { disease: searchRegex },
          { autoantibody: searchRegex },
          { autoantibody: new RegExp('ro52', 'i') },
          { autoantibody: new RegExp('anti-ro52', 'i') },
          { autoantibody: new RegExp('ssa', 'i') },
          { autoantibody: new RegExp('ro\\/ssa', 'i') },
          { autoantibody: new RegExp('ro \\(ssa\\)', 'i') },
          { autoantibody: new RegExp('ro/ss-a', 'i') },
          { autoantibody: new RegExp('ro ss-a', 'i') },
          { autoantigen: searchRegex },
          { epitope: searchRegex },
          { uniprotId: searchRegex },
          { diseaseAssociation: searchRegex },
          { affinity: searchRegex },
          { avidity: searchRegex },
          { mechanism: searchRegex },
          { isotypeSubclasses: searchRegex },
          { sensitivity: searchRegex },
          { diagnosticMarker: searchRegex },
          { associationWithDiseaseActivity: searchRegex },
          { pathogenesisInvolvement: searchRegex },
          { reference: searchRegex },
          { databaseAccessionNumbers: searchRegex },
          { synonym: searchRegex },
          { screening: searchRegex },
          { confirmation: searchRegex },
          { monitoring: searchRegex },
          { positivePredictiveValues: searchRegex },
          { negativePredictiveValues: searchRegex },
          { crossReactivityPatterns: searchRegex },
          { referenceRangesAndCutoffValues: searchRegex },
          { type: searchRegex },
          { priority: searchRegex }
        );
      } else {
        // Regular search for non-Ro52 terms
        searchTerms.push(
          { disease: searchRegex },
          { autoantibody: searchRegex },
          { autoantigen: searchRegex },
          { epitope: searchRegex },
          { uniprotId: searchRegex },
          { diseaseAssociation: searchRegex },
          { affinity: searchRegex },
          { avidity: searchRegex },
          { mechanism: searchRegex },
          { isotypeSubclasses: searchRegex },
          { sensitivity: searchRegex },
          { diagnosticMarker: searchRegex },
          { associationWithDiseaseActivity: searchRegex },
          { pathogenesisInvolvement: searchRegex },
          { reference: searchRegex },
          { databaseAccessionNumbers: searchRegex },
          { synonym: searchRegex },
          { screening: searchRegex },
          { confirmation: searchRegex },
          { monitoring: searchRegex },
          { positivePredictiveValues: searchRegex },
          { negativePredictiveValues: searchRegex },
          { crossReactivityPatterns: searchRegex },
          { referenceRangesAndCutoffValues: searchRegex },
          { type: searchRegex },
          { priority: searchRegex }
        );
      }
      searchConditions.push({ $or: searchTerms });
    } else if (['disease', 'autoantibody', 'autoantigen', 'epitope', 'uniprotId', 'diseaseAssociation', 'affinity', 'avidity', 'mechanism', 'isotypeSubclasses', 'sensitivity', 'diagnosticMarker', 'associationWithDiseaseActivity', 'pathogenesisInvolvement', 'reference', 'databaseAccessionNumbers', 'synonym', 'screening', 'confirmation', 'monitoring', 'positivePredictiveValues', 'negativePredictiveValues', 'crossReactivityPatterns', 'referenceRangesAndCutoffValues', 'type', 'priority'].includes(field)) {
      const searchQuery = {};
      
      // Use partial matching for autoantibody field search to show diseases associated with autoantibodies containing the search term
      if (field === 'autoantibody') {
        searchQuery[field] = searchRegex; // Use partial matching (contains) instead of exact matching
      } else {
        searchQuery[field] = searchRegex;
      }
      searchConditions.push(searchQuery);
    }
  }

  // Handle specific field filters - using exact matching (case-insensitive)
  if (disease && disease.trim()) {
    const escapedValue = disease.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ disease: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (autoantibody && autoantibody.trim()) {
    const autoantibodyTrimmed = autoantibody.trim();
    const escapedValue = autoantibodyTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ autoantibody: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (autoantigen && autoantigen.trim()) {
    const escapedValue = autoantigen.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ autoantigen: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (epitope && epitope.trim()) {
    const escapedValue = epitope.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ epitope: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (uniprotId && uniprotId.trim()) {
    const escapedValue = uniprotId.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ uniprotId: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (diseaseAssociation && diseaseAssociation.trim()) {
    const escapedValue = diseaseAssociation.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ diseaseAssociation: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (affinity && affinity.trim()) {
    const escapedValue = affinity.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ affinity: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (sensitivity && sensitivity.trim()) {
    const escapedValue = sensitivity.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ sensitivity: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (diagnosticMarker && diagnosticMarker.trim()) {
    const escapedValue = diagnosticMarker.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ diagnosticMarker: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (associationWithDiseaseActivity && associationWithDiseaseActivity.trim()) {
    const escapedValue = associationWithDiseaseActivity.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ associationWithDiseaseActivity: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (pathogenesisInvolvement && pathogenesisInvolvement.trim()) {
    const escapedValue = pathogenesisInvolvement.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ pathogenesisInvolvement: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (reference && reference.trim()) {
    const escapedValue = reference.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ reference: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (databaseAccessionNumbers && databaseAccessionNumbers.trim()) {
    const escapedValue = databaseAccessionNumbers.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ databaseAccessionNumbers: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (synonym && synonym.trim()) {
    const escapedValue = synonym.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ synonym: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (screening && screening.trim()) {
    const escapedValue = screening.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ screening: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (confirmation && confirmation.trim()) {
    const escapedValue = confirmation.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ confirmation: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (monitoring && monitoring.trim()) {
    const escapedValue = monitoring.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ monitoring: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (positivePredictiveValues && positivePredictiveValues.trim()) {
    const escapedValue = positivePredictiveValues.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ positivePredictiveValues: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (negativePredictiveValues && negativePredictiveValues.trim()) {
    const escapedValue = negativePredictiveValues.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ negativePredictiveValues: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (crossReactivityPatterns && crossReactivityPatterns.trim()) {
    const escapedValue = crossReactivityPatterns.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ crossReactivityPatterns: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (referenceRangesAndCutoffValues && referenceRangesAndCutoffValues.trim()) {
    const escapedValue = referenceRangesAndCutoffValues.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ referenceRangesAndCutoffValues: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (type && type.trim()) {
    const escapedValue = type.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ type: new RegExp(`^${escapedValue}$`, 'i') });
  }
  if (priority && priority.trim()) {
    const escapedValue = priority.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filterConditions.push({ priority: new RegExp(`^${escapedValue}$`, 'i') });
  }

  // Combine search and filter conditions
  const allConditions = [...searchConditions, ...filterConditions];
  
  if (allConditions.length === 0) {
    return {};
  } else if (allConditions.length === 1) {
    return allConditions[0];
  } else {
    return { $and: allConditions };
  }
};

export const getRelatedEntries = async (entry) => {
  try {
    return await DiseaseData.find({
      $or: [
        { disease: entry.disease },
        { autoantigen: entry.autoantigen },
        { uniprotId: entry.uniprotId && entry.uniprotId !== 'Multiple' ? entry.uniprotId : null }
      ].filter(condition => Object.values(condition).some(val => val)),
      _id: { $ne: entry._id }
    }).limit(5).lean();
  } catch (error) {
    console.error('Error fetching related entries:', error);
    return [];
  }
};

export const validateBulkEntries = (entries) => {
  const errors = [];
  
  if (!Array.isArray(entries)) {
    errors.push('Entries must be an array');
    return errors;
  }

  entries.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      errors.push(`Entry ${index + 1}: Invalid entry format`);
      return;
    }

    if (!entry.disease || !entry.disease.toString().trim()) {
      errors.push(`Entry ${index + 1}: Disease is required`);
    }
    if (!entry.autoantibody || !entry.autoantibody.toString().trim()) {
      errors.push(`Entry ${index + 1}: Autoantibody is required`);
    }
    if (!entry.autoantigen || !entry.autoantigen.toString().trim()) {
      errors.push(`Entry ${index + 1}: Autoantigen is required`);
    }
    if (!entry.epitope || !entry.epitope.toString().trim()) {
      errors.push(`Entry ${index + 1}: Epitope is required`);
    }
    if (!entry.uniprotId || !entry.uniprotId.toString().trim()) {
      errors.push(`Entry ${index + 1}: UniProt ID is required`);
    }
   
  });
  
  return errors;
};

export const escapeCSV = (str) => {
  if (!str) return '';
  const stringValue = str.toString();
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const convertToCSV = (entries) => {
  if (!entries || entries.length === 0) return '';
  
  const headers = ['Disease', 'Database Accession Numbers', 'Autoantibody', 'Synonym', 'Disease Association', 'Autoantigen', 'Epitope', 'Epitope Prevalence', 'UniProt ID', 'Screening', 'Confirmation', 'Monitoring', 'Affinity', 'Avidity', 'Mechanism', 'Isotype Subclasses', 'Sensitivity', 'Diagnostic Marker', 'Association with Disease Activity', 'Positive Predictive Values', 'Negative Predictive Values', 'Cross Reactivity Patterns', 'Pathogenesis Involvement', 'Reference Ranges and Cutoff Values', 'Reference', 'Type', 'Priority', 'Date Added', 'Last Updated', 'Verified'];
  const csvRows = [headers.join(',')];
  
  entries.forEach(entry => {
    const row = [
      escapeCSV(entry.disease || ''),
      escapeCSV(entry.databaseAccessionNumbers || ''),
      escapeCSV(entry.autoantibody || ''),
      escapeCSV(entry.synonym || ''),
      escapeCSV(entry.diseaseAssociation || ''),
      escapeCSV(entry.autoantigen || ''),
      escapeCSV(entry.epitope || ''),
      escapeCSV(entry.epitopePrevalence || ''),
      escapeCSV(entry.uniprotId || ''),
      escapeCSV(entry.screening || ''),
      escapeCSV(entry.confirmation || ''),
      escapeCSV(entry.monitoring || ''),
      escapeCSV(entry.affinity || ''),
      escapeCSV(entry.avidity || ''),
      escapeCSV(entry.mechanism || ''),
      escapeCSV(entry.isotypeSubclasses || ''),
      escapeCSV(entry.sensitivity || ''),
      escapeCSV(entry.diagnosticMarker || ''),
      escapeCSV(entry.associationWithDiseaseActivity || ''),
      escapeCSV(entry.positivePredictiveValues || ''),
      escapeCSV(entry.negativePredictiveValues || ''),
      escapeCSV(entry.crossReactivityPatterns || ''),
      escapeCSV(entry.pathogenesisInvolvement || ''),
      escapeCSV(entry.referenceRangesAndCutoffValues || ''),
      escapeCSV(entry.reference || ''),
      escapeCSV(entry.type || ''),
      escapeCSV(entry.priority || ''),
      entry.createdAt ? new Date(entry.createdAt).toISOString().split('T')[0] : '',
      entry.metadata?.lastUpdated ? new Date(entry.metadata.lastUpdated).toISOString().split('T')[0] : '',
      entry.metadata?.verified ? 'Yes' : 'No'
    ];
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
};

export const handleError = (res, error, message) => {
  console.error(`${message}:`, error);
  
  // Handle specific MongoDB errors
  let statusCode = 500;
  let errorMessage = message;

  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = 'Validation error: ' + Object.values(error.errors).map(e => e.message).join(', ');
  } else if (error.name === 'CastError') {
    statusCode = 400;
    errorMessage = 'Invalid ID format';
  } else if (error.code === 11000) {
    statusCode = 409;
    errorMessage = 'Duplicate entry found';
  }

  res.status(statusCode).json({
    success: false,
    message: errorMessage,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// Controller Methods

export const getAllEntries = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    // Allow higher limit (up to 10000) to support fetching all results when autoantibody or disease filter is active
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 10000);
    const skip = (page - 1) * limit;
    
    const { search, field, disease, autoantibody, autoantigen, epitope, uniprotId, diseaseAssociation, affinity, sensitivity, diagnosticMarker, associationWithDiseaseActivity, pathogenesisInvolvement, reference, databaseAccessionNumbers, synonym, screening, confirmation, monitoring, positivePredictiveValues, negativePredictiveValues, crossReactivityPatterns, referenceRangesAndCutoffValues, type, sortBy = 'disease', sortOrder = 'asc' } = req.query;

    // Build combined query
    const query = buildCombinedQuery({ search, field, disease, autoantibody, autoantigen, epitope, uniprotId, diseaseAssociation, affinity, sensitivity, diagnosticMarker, associationWithDiseaseActivity, pathogenesisInvolvement, reference, databaseAccessionNumbers, synonym, screening, confirmation, monitoring, positivePredictiveValues, negativePredictiveValues, crossReactivityPatterns, referenceRangesAndCutoffValues, type });

    // Build sort object with validation
    const validSortFields = ['disease', 'autoantibody', 'autoantigen', 'epitope', 'uniprotId', 'diseaseAssociation', 'affinity', 'avidity', 'mechanism', 'isotypeSubclasses', 'sensitivity', 'diagnosticMarker', 'associationWithDiseaseActivity', 'pathogenesisInvolvement', 'reference', 'databaseAccessionNumbers', 'synonym', 'screening', 'confirmation', 'monitoring', 'positivePredictiveValues', 'negativePredictiveValues', 'crossReactivityPatterns', 'referenceRangesAndCutoffValues', 'type', 'priority', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'disease';
    const sort = {};
    
    // Always sort by priority first when displaying diseases, then by the requested field
    // Use aggregation to sort by priority first, then by the requested field
    const sortOrderNum = sortOrder === 'desc' ? -1 : 1;
    const entriesAggregation = await DiseaseData.aggregate([
      { $match: query },
      {
        $addFields: {
          priorityNum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$priority', null] },
                  { $ne: ['$priority', ''] },
                  { $ne: [{ $type: '$priority' }, 'missing'] }
                ]
              },
              {
                $cond: [
                  { $eq: [{ $type: '$priority' }, 'number'] },
                  '$priority',
                  {
                    $cond: [
                      { $eq: [{ $type: '$priority' }, 'string'] },
                      {
                        $cond: [
                          { $regexMatch: { input: '$priority', regex: /^-?\d+(\.\d+)?$/ } },
                          { $toDouble: '$priority' },
                          0
                        ]
                      },
                      0
                    ]
                  }
                ]
              },
              0
            ]
          }
        }
      },
      {
        $sort: {
          priorityNum: -1, // Higher priority first
          [sortField]: sortOrderNum
        }
      },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          priorityNum: 0 // Remove the temporary field (priority is included by default in exclusion projection)
        }
      }
    ]);
      
    const total = await DiseaseData.countDocuments(query).exec();
    
    res.json({
      success: true,
      data: entriesAggregation,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      appliedFilters: {
        search: search || null,
        field: field || null,
        disease: disease || null,
        autoantibody: autoantibody || null,
        autoantigen: autoantigen || null,
        epitope: epitope || null,
        uniprotId: uniprotId || null,
        diseaseAssociation: diseaseAssociation || null,
        affinity: affinity || null,
        sensitivity: sensitivity || null,
        diagnosticMarker: diagnosticMarker || null,
        associationWithDiseaseActivity: associationWithDiseaseActivity || null,
        pathogenesisInvolvement: pathogenesisInvolvement || null,
        reference: reference || null,
        databaseAccessionNumbers: databaseAccessionNumbers || null,
        synonym: synonym || null,
        screening: screening || null,
        confirmation: confirmation || null,
        monitoring: monitoring || null,
        positivePredictiveValues: positivePredictiveValues || null,
        negativePredictiveValues: negativePredictiveValues || null,
        crossReactivityPatterns: crossReactivityPatterns || null,
        referenceRangesAndCutoffValues: referenceRangesAndCutoffValues || null,
        type: type || null,
        sortBy: sortField,
        sortOrder
      }
    });
  } catch (error) {
    handleError(res, error, 'Error fetching entries');
  }
};

export const getEntryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Valid entry ID is required'
      });
    }

    const entry = await DiseaseData.findById(id);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    const relatedEntries = await getRelatedEntries(entry);

    // Add virtual fields to the response
    const entryWithVirtuals = {
      ...entry.toObject(),
      additional: serializeAdditionalFields(entry),
      formattedEpitopePrevalence: entry.formattedEpitopePrevalence,
      diagnosticMethods: entry.diagnosticMethods,
      predictiveValuesSummary: entry.predictiveValuesSummary
    };

    res.json({
      success: true,
      data: entryWithVirtuals,
      relatedEntries: relatedEntries
    });
  } catch (error) {
    handleError(res, error, 'Error fetching entry');
  }
};

export const createEntry = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Check for required fields
    const { disease, autoantibody, autoantigen, epitope, uniprotId } = req.body;
    if (!disease || !autoantibody || !autoantigen || !epitope || !uniprotId) {
      return res.status(400).json({
        success: false,
        message: 'Disease, autoantibody, autoantigen, epitope, and UniProt ID are required'
      });
    }

    const entry = new DiseaseData({
      ...req.body,
      metadata: {
        ...req.body.metadata,
        dateAdded: new Date(),
        lastUpdated: new Date()
      }
    });
    
    await entry.save();

    const entryWithSerializedAdditional = {
      ...entry.toObject(),
      additional: serializeAdditionalFields(entry)
    };

    res.status(201).json({
      success: true,
      message: 'Entry created successfully',
      data: entryWithSerializedAdditional
    });
  } catch (error) {
    handleError(res, error, 'Error creating entry');
  }
};

export const updateEntry = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Valid entry ID is required'
      });
    }

    const updateData = {
      ...req.body,
      'metadata.lastUpdated': new Date()
    };

    const entry = await DiseaseData.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    );

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    const entryWithSerializedAdditional = {
      ...entry.toObject(),
      additional: serializeAdditionalFields(entry)
    };

    res.json({
      success: true,
      message: 'Entry updated successfully',
      data: entryWithSerializedAdditional
    });
  } catch (error) {
    handleError(res, error, 'Error updating entry');
  }
};

export const deleteEntry = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Valid entry ID is required'
      });
    }

    const entry = await DiseaseData.findByIdAndDelete(id);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    res.json({
      success: true,
      message: 'Entry deleted successfully'
    });
  } catch (error) {
    handleError(res, error, 'Error deleting entry');
  }
};

export const searchEntries = async (req, res) => {
  try {
    const { q: searchTerm, field = 'all', limit = 20 } = req.query;
    
    if (!searchTerm || searchTerm.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const query = buildCombinedQuery({ search: searchTerm, field });
    const maxLimit = Math.min(parseInt(limit), 1000);

    // Sort by priority first (descending), then by disease and autoantibody
    const entries = await DiseaseData.aggregate([
      { $match: query },
      {
        $addFields: {
          priorityNum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$priority', null] },
                  { $ne: ['$priority', ''] },
                  { $ne: [{ $type: '$priority' }, 'missing'] }
                ]
              },
              {
                $cond: [
                  { $eq: [{ $type: '$priority' }, 'number'] },
                  '$priority',
                  {
                    $cond: [
                      { $eq: [{ $type: '$priority' }, 'string'] },
                      {
                        $cond: [
                          { $regexMatch: { input: '$priority', regex: /^-?\d+(\.\d+)?$/ } },
                          { $toDouble: '$priority' },
                          0
                        ]
                      },
                      0
                    ]
                  }
                ]
              },
              0
            ]
          }
        }
      },
      {
        $sort: {
          priorityNum: -1, // Higher priority first
          disease: 1,
          autoantibody: 1
        }
      },
      { $limit: maxLimit },
      {
        $project: {
          priorityNum: 0 // Remove the temporary field (priority is included by default in exclusion projection)
        }
      }
    ]);

    res.json({
      success: true,
      data: entries,
      count: entries.length,
      searchTerm: searchTerm.trim()
    });
  } catch (error) {
    handleError(res, error, 'Error searching entries');
  }
};

export const advancedSearch = async (req, res) => {
  try {
    const { q: searchTerm, limit = 50, includeStats = false } = req.query;
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters long'
      });
    }

    const searchRegex = new RegExp(searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    
    const pipeline = [
      {
        $match: {
          $or: [
            { disease: searchRegex },
            { autoantibody: searchRegex },
            { autoantigen: searchRegex },
            { epitope: searchRegex },
            { uniprotId: searchRegex },
            { diseaseAssociation: searchRegex },
            { affinity: searchRegex },
            { avidity: searchRegex },
            { mechanism: searchRegex },
            { isotypeSubclasses: searchRegex },
            { sensitivity: searchRegex },
            { diagnosticMarker: searchRegex },
            { associationWithDiseaseActivity: searchRegex },
            { pathogenesisInvolvement: searchRegex },
            { reference: searchRegex },
            { databaseAccessionNumbers: searchRegex },
            { synonym: searchRegex },
            { screening: searchRegex },
            { confirmation: searchRegex },
            { monitoring: searchRegex },
            { positivePredictiveValues: searchRegex },
            { negativePredictiveValues: searchRegex },
            { crossReactivityPatterns: searchRegex },
            { referenceRangesAndCutoffValues: searchRegex },
            { type: searchRegex },
            { priority: searchRegex }
          ]
        }
      },
      {
        $addFields: {
          relevanceScore: {
            $sum: [
              { $cond: [{ $regexMatch: { input: '$disease', regex: searchRegex } }, 10, 0] },
              { $cond: [{ $regexMatch: { input: '$autoantibody', regex: searchRegex } }, 8, 0] },
              { $cond: [{ $regexMatch: { input: '$autoantigen', regex: searchRegex } }, 6, 0] },
              { $cond: [{ $regexMatch: { input: { $ifNull: ['$epitope', ''] }, regex: searchRegex } }, 4, 0] },
              { $cond: [{ $regexMatch: { input: { $ifNull: ['$uniprotId', ''] }, regex: searchRegex } }, 2, 0] },
              { $cond: [{ $regexMatch: { input: { $ifNull: ['$diseaseAssociation', ''] }, regex: searchRegex } }, 3, 0] },
              { $cond: [{ $regexMatch: { input: { $ifNull: ['$diagnosticMarker', ''] }, regex: searchRegex } }, 5, 0] },
              { $cond: [{ $regexMatch: { input: { $ifNull: ['$pathogenesisInvolvement', ''] }, regex: searchRegex } }, 3, 0] },
              { $cond: [{ $regexMatch: { input: { $ifNull: ['$reference', ''] }, regex: searchRegex } }, 1, 0] }
            ]
          }
        }
      },
      {
        $sort: { relevanceScore: -1, disease: 1 }
      },
      {
        $limit: Math.min(parseInt(limit), 100)
      }
    ];

    const results = await DiseaseData.aggregate(pipeline);

    let stats = null;
    if (includeStats === 'true') {
      const statsResult = await DiseaseData.aggregate([
        {
          $match: {
            $or: [
              { disease: searchRegex },
              { autoantibody: searchRegex },
              { autoantigen: searchRegex },
              { epitope: searchRegex },
              { uniprotId: searchRegex },
              { diseaseAssociation: searchRegex },
              { affinity: searchRegex },
              { avidity: searchRegex },
              { mechanism: searchRegex },
              { isotypeSubclasses: searchRegex },
              { sensitivity: searchRegex },
              { diagnosticMarker: searchRegex },
              { associationWithDiseaseActivity: searchRegex },
              { pathogenesisInvolvement: searchRegex },
              { reference: searchRegex },
              { databaseAccessionNumbers: searchRegex },
              { synonym: searchRegex },
              { screening: searchRegex },
              { confirmation: searchRegex },
              { monitoring: searchRegex },
              { positivePredictiveValues: searchRegex },
              { negativePredictiveValues: searchRegex },
              { crossReactivityPatterns: searchRegex },
              { referenceRangesAndCutoffValues: searchRegex },
              { type: searchRegex },
              { priority: searchRegex }
            ]
          }
        },
        {
          $group: {
            _id: null,
            totalMatches: { $sum: 1 },
            uniqueDiseases: { $addToSet: '$disease' },
            uniqueAntibodies: { $addToSet: '$autoantibody' },
            uniqueAntigens: { $addToSet: '$autoantigen' }
          }
        },
        {
          $project: {
            totalMatches: 1,
            uniqueDiseasesCount: { $size: '$uniqueDiseases' },
            uniqueAntibodiesCount: { $size: '$uniqueAntibodies' },
            uniqueAntigensCount: { $size: '$uniqueAntigens' }
          }
        }
      ]);
      
      stats = statsResult[0] || { 
        totalMatches: 0, 
        uniqueDiseasesCount: 0, 
        uniqueAntibodiesCount: 0, 
        uniqueAntigensCount: 0 
      };
    }

    res.json({
      success: true,
      data: results,
      count: results.length,
      searchTerm: searchTerm.trim(),
      stats
    });
  } catch (error) {
    handleError(res, error, 'Error performing advanced search');
  }
};

export const getEntriesByDisease = async (req, res) => {
  try {
    const { disease } = req.params;
    
    if (!disease || !disease.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Disease name is required'
      });
    }

    // Sort by priority first (descending), then by autoantibody and autoantigen
    const entries = await DiseaseData.aggregate([
      {
        $match: {
          disease: new RegExp(disease.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        }
      },
      {
        $addFields: {
          priorityNum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$priority', null] },
                  { $ne: ['$priority', ''] },
                  { $ne: [{ $type: '$priority' }, 'missing'] }
                ]
              },
              {
                $cond: [
                  { $eq: [{ $type: '$priority' }, 'number'] },
                  '$priority',
                  {
                    $cond: [
                      { $eq: [{ $type: '$priority' }, 'string'] },
                      {
                        $cond: [
                          { $regexMatch: { input: '$priority', regex: /^-?\d+(\.\d+)?$/ } },
                          { $toDouble: '$priority' },
                          0
                        ]
                      },
                      0
                    ]
                  }
                ]
              },
              0
            ]
          }
        }
      },
      {
        $sort: {
          priorityNum: -1, // Higher priority first
          autoantibody: 1,
          autoantigen: 1
        }
      },
      {
        $project: {
          priorityNum: 0 // Remove the temporary field (priority is included by default in exclusion projection)
        }
      }
    ]);

    res.json({
      success: true,
      data: entries,
      count: entries.length
    });
  } catch (error) {
    handleError(res, error, 'Error fetching entries by disease');
  }
};

export const getEntriesByUniprotId = async (req, res) => {
  try {
    const { uniprotId } = req.params;
    
    if (!uniprotId || !uniprotId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'UniProt ID is required'
      });
    }

    // Sort by priority first (descending), then by disease and autoantibody
    const entries = await DiseaseData.aggregate([
      {
        $match: {
          uniprotId: uniprotId.toUpperCase().trim()
        }
      },
      {
        $addFields: {
          priorityNum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$priority', null] },
                  { $ne: ['$priority', ''] },
                  { $ne: [{ $type: '$priority' }, 'missing'] }
                ]
              },
              {
                $cond: [
                  { $eq: [{ $type: '$priority' }, 'number'] },
                  '$priority',
                  {
                    $cond: [
                      { $eq: [{ $type: '$priority' }, 'string'] },
                      {
                        $cond: [
                          { $regexMatch: { input: '$priority', regex: /^-?\d+(\.\d+)?$/ } },
                          { $toDouble: '$priority' },
                          0
                        ]
                      },
                      0
                    ]
                  }
                ]
              },
              0
            ]
          }
        }
      },
      {
        $sort: {
          priorityNum: -1, // Higher priority first
          disease: 1,
          autoantibody: 1
        }
      },
      {
        $project: {
          priorityNum: 0 // Remove the temporary field (priority is included by default in exclusion projection)
        }
      }
    ]);

    res.json({
      success: true,
      data: entries,
      count: entries.length
    });
  } catch (error) {
    handleError(res, error, 'Error fetching entries by UniProt ID');
  }
};

export const getUniqueValues = async (req, res) => {
  try {
    const { field } = req.params;
    
    if (!field || !['disease', 'autoantibody', 'autoantigen', 'epitope', 'uniprotId', 'diseaseAssociation', 'affinity', 'avidity', 'mechanism', 'isotypeSubclasses', 'sensitivity', 'diagnosticMarker', 'associationWithDiseaseActivity', 'pathogenesisInvolvement', 'reference', 'databaseAccessionNumbers', 'synonym', 'screening', 'confirmation', 'monitoring', 'positivePredictiveValues', 'negativePredictiveValues', 'crossReactivityPatterns', 'referenceRangesAndCutoffValues', 'type'].includes(field)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid field specified. Must be one of: disease, autoantibody, autoantigen, epitope, uniprotId, diseaseAssociation, affinity, avidity, mechanism, isotypeSubclasses, sensitivity, diagnosticMarker, associationWithDiseaseActivity, pathogenesisInvolvement, reference, databaseAccessionNumbers, synonym, screening, confirmation, monitoring, positivePredictiveValues, negativePredictiveValues, crossReactivityPatterns, referenceRangesAndCutoffValues, type'
      });
    }

    const values = await DiseaseData.distinct(field);
    // Normalize and deduplicate case-insensitively while preserving first-seen original
    const seen = new Map();
    values.forEach((value) => {
      if (!value) return;
      const original = value.toString().trim();
      if (!original) return;
      const key = original.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, original);
      }
    });
    
    let filteredValues = Array.from(seen.values());
    
    // If field is 'disease', sort by priority first, then alphabetically
    if (field === 'disease') {
      // Get priority for each disease
      const diseasePriorityMap = new Map();
      const diseaseEntries = await DiseaseData.find({ disease: { $in: filteredValues } })
        .select('disease priority')
        .lean();
      
      diseaseEntries.forEach(entry => {
        if (entry.disease && entry.disease.trim()) {
          const disease = entry.disease.trim();
          let priority = 0;
          if (entry.priority) {
            const parsed = parseFloat(entry.priority);
            priority = isNaN(parsed) ? 0 : parsed;
          }
          const diseaseLower = disease.toLowerCase();
          if (!diseasePriorityMap.has(diseaseLower) || diseasePriorityMap.get(diseaseLower) < priority) {
            diseasePriorityMap.set(diseaseLower, priority);
          }
        }
      });
      
      filteredValues = filteredValues.sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const priorityA = diseasePriorityMap.get(aLower) || 0;
        const priorityB = diseasePriorityMap.get(bLower) || 0;
        
        // First sort by priority (descending)
        if (priorityB !== priorityA) {
          return priorityB - priorityA;
        }
        // Then sort alphabetically
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
      });
    } else {
      // For other fields, sort alphabetically
      filteredValues = filteredValues.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }

    res.json({
      success: true,
      data: filteredValues,
      count: filteredValues.length
    });
  } catch (error) {
    handleError(res, error, 'Error fetching unique values');
  }
};

export const getFilteredUniqueValues = async (req, res) => {
  try {
    const { field } = req.params;
    const { disease, autoantibody, autoantigen, epitope } = req.query;

    if (!field || !['disease', 'autoantibody', 'autoantigen', 'epitope', 'uniprotId', 'diseaseAssociation', 'affinity', 'avidity', 'mechanism', 'isotypeSubclasses', 'sensitivity', 'diagnosticMarker', 'associationWithDiseaseActivity', 'pathogenesisInvolvement', 'reference', 'databaseAccessionNumbers', 'synonym', 'screening', 'confirmation', 'monitoring', 'positivePredictiveValues', 'negativePredictiveValues', 'crossReactivityPatterns', 'referenceRangesAndCutoffValues', 'type'].includes(field)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid field specified. Must be one of: disease, autoantibody, autoantigen, epitope, uniprotId, diseaseAssociation, affinity, avidity, mechanism, isotypeSubclasses, sensitivity, diagnosticMarker, associationWithDiseaseActivity, pathogenesisInvolvement, reference, databaseAccessionNumbers, synonym, screening, confirmation, monitoring, positivePredictiveValues, negativePredictiveValues, crossReactivityPatterns, referenceRangesAndCutoffValues, type'
      });
    }

    // Build filter query based on dependencies
    let filterQuery = {};
    
    if (field === 'disease') {
      // Support reverse filtering: filter diseases by autoantibody, autoantigen, or epitope
      if (autoantibody) {
        const autoantibodyTrimmed = autoantibody.trim();
        const escapedValue = autoantibodyTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterQuery.autoantibody = new RegExp(`^${escapedValue}$`, 'i');
      }
      if (autoantigen) {
        const escapedValue = autoantigen.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterQuery.autoantigen = new RegExp(`^${escapedValue}$`, 'i');
      }
      if (epitope) {
        const escapedValue = epitope.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterQuery.epitope = new RegExp(`^${escapedValue}$`, 'i');
      }
    } else if (field === 'autoantibody') {
      // Filter autoantibody by disease or autoantigen (reverse filtering)
      if (disease) {
        const escapedValue = disease.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterQuery.disease = new RegExp(`^${escapedValue}$`, 'i');
      }
      if (autoantigen) {
        const escapedValue = autoantigen.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterQuery.autoantigen = new RegExp(`^${escapedValue}$`, 'i');
      }
    } else if (field === 'autoantigen') {
      if (disease) {
        const escapedValue = disease.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterQuery.disease = new RegExp(`^${escapedValue}$`, 'i');
      }
      if (autoantibody) {
        const escapedValue = autoantibody.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterQuery.autoantibody = new RegExp(`^${escapedValue}$`, 'i');
      }
    } else if (field === 'epitope') {
      if (autoantigen) {
        const escapedValue = autoantigen.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterQuery.autoantigen = new RegExp(`^${escapedValue}$`, 'i');
      }
      if (disease) {
        const escapedValue = disease.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterQuery.disease = new RegExp(`^${escapedValue}$`, 'i');
      }
      if (autoantibody) {
        const escapedValue = autoantibody.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterQuery.autoantibody = new RegExp(`^${escapedValue}$`, 'i');
      }
      // Only return epitopes for specific autoantigen/disease combinations
      if (!autoantigen && !disease && !autoantibody) {
        return res.json({
          success: true,
          data: [],
          count: 0
        });
      }
    } else if (field === 'uniprotId') {
      // Filter UniProt IDs by autoantibody, autoantigen, disease, or epitope
      if (autoantibody) {
        const escapedValue = autoantibody.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterQuery.autoantibody = new RegExp(`^${escapedValue}$`, 'i');
      }
      if (autoantigen) {
        const escapedValue = autoantigen.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterQuery.autoantigen = new RegExp(`^${escapedValue}$`, 'i');
      }
      if (disease) {
        const escapedValue = disease.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterQuery.disease = new RegExp(`^${escapedValue}$`, 'i');
      }
      if (epitope) {
        const escapedValue = epitope.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterQuery.epitope = new RegExp(`^${escapedValue}$`, 'i');
      }
    } else if (field === 'type') {
      // Filter type by disease, autoantibody, autoantigen, or epitope
      if (disease) {
        const escapedValue = disease.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterQuery.disease = new RegExp(`^${escapedValue}$`, 'i');
      }
      if (autoantibody) {
        const escapedValue = autoantibody.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterQuery.autoantibody = new RegExp(`^${escapedValue}$`, 'i');
      }
      if (autoantigen) {
        const escapedValue = autoantigen.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterQuery.autoantigen = new RegExp(`^${escapedValue}$`, 'i');
      }
      if (epitope) {
        const escapedValue = epitope.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterQuery.epitope = new RegExp(`^${escapedValue}$`, 'i');
      }
    }

    const values = await DiseaseData.distinct(field, filterQuery);
    // Normalize and deduplicate case-insensitively while preserving first-seen original
    const seen = new Map();
    values.forEach((value) => {
      if (!value) return;
      const original = value.toString().trim();
      if (!original) return;
      const key = original.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, original);
      }
    });
    
    let filteredValues = Array.from(seen.values());
    
    // If field is 'disease', sort by priority first, then alphabetically
    if (field === 'disease') {
      // Get priority for each disease
      const diseasePriorityMap = new Map();
      const diseaseEntries = await DiseaseData.find({ 
        disease: { $in: filteredValues },
        ...filterQuery
      })
        .select('disease priority')
        .lean();
      
      diseaseEntries.forEach(entry => {
        if (entry.disease && entry.disease.trim()) {
          const disease = entry.disease.trim();
          let priority = 0;
          if (entry.priority) {
            const parsed = parseFloat(entry.priority);
            priority = isNaN(parsed) ? 0 : parsed;
          }
          const diseaseLower = disease.toLowerCase();
          if (!diseasePriorityMap.has(diseaseLower) || diseasePriorityMap.get(diseaseLower) < priority) {
            diseasePriorityMap.set(diseaseLower, priority);
          }
        }
      });
      
      filteredValues = filteredValues.sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const priorityA = diseasePriorityMap.get(aLower) || 0;
        const priorityB = diseasePriorityMap.get(bLower) || 0;
        
        // First sort by priority (descending)
        if (priorityB !== priorityA) {
          return priorityB - priorityA;
        }
        // Then sort alphabetically
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
      });
    } else {
      // For other fields, sort alphabetically
      filteredValues = filteredValues.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }

    res.json({
      success: true,
      data: filteredValues,
      count: filteredValues.length,
      appliedFilters: { disease, autoantibody, autoantigen, epitope }
    });
  } catch (error) {
    handleError(res, error, 'Error fetching filtered unique values');
  }
};

export const getStatistics = async (req, res) => {
  try {
    const stats = await DiseaseData.aggregate([
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          uniqueDiseases: { $addToSet: '$disease' },
          uniqueAntibodies: { $addToSet: '$autoantibody' },
          uniqueAntigens: { $addToSet: '$autoantigen' },
          uniqueUniprotIds: { $addToSet: '$uniprotId' },
          verifiedEntries: { $sum: { $cond: ['$metadata.verified', 1, 0] } }
        }
      },
      {
        $project: {
          totalEntries: 1,
          verifiedEntries: 1,
          uniqueDiseasesCount: { $size: '$uniqueDiseases' },
          uniqueAntibodiesCount: { $size: '$uniqueAntibodies' },
          uniqueAntigensCount: { $size: '$uniqueAntigens' },
          uniqueUniprotIdsCount: { $size: '$uniqueUniprotIds' },
          uniqueDiseases: 1,
          uniqueAntibodies: 1,
          uniqueAntigens: 1
        }
      }
    ]);

    const [diseaseStats, antibodyStats, antigenStats, diagnosticMarkerStats, affinityStats, sensitivityStats] = await Promise.all([
      DiseaseData.aggregate([
        { $group: { _id: '$disease', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]),
      DiseaseData.aggregate([
        { $group: { _id: '$autoantibody', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      DiseaseData.aggregate([
        { $group: { _id: '$autoantigen', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      DiseaseData.aggregate([
        { $match: { diagnosticMarker: { $exists: true, $ne: '' } } },
        { $group: { _id: '$diagnosticMarker', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      DiseaseData.aggregate([
        { $match: { affinity: { $exists: true, $ne: '' } } },
        { $group: { _id: '$affinity', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      DiseaseData.aggregate([
        { $match: { sensitivity: { $exists: true, $ne: '' } } },
        { $group: { _id: '$sensitivity', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {},
        diseaseBreakdown: diseaseStats,
        topAntibodies: antibodyStats,
        topAntigens: antigenStats,
        diagnosticMarkerBreakdown: diagnosticMarkerStats,
        affinityBreakdown: affinityStats,
        sensitivityBreakdown: sensitivityStats
      }
    });
  } catch (error) {
    handleError(res, error, 'Error fetching statistics');
  }
};

// Return distinct keys present under the `additional` map across all documents
export const getDistinctAdditionalKeys = async (req, res) => {
  try {
    const pipeline = [
      { $match: { additional: { $type: 'object' } } },
      { $project: { kv: { $objectToArray: '$additional' } } },
      { $unwind: '$kv' },
      { $group: { _id: { $toLower: { $ifNull: ['$kv.k', ''] } }, original: { $first: '$kv.k' } } },
      { $match: { _id: { $ne: '' } } },
      { $project: { _id: 0, key: '$original' } },
      { $sort: { key: 1 } }
    ];

    const results = await DiseaseData.aggregate(pipeline);
    const keys = results.map((r) => r.key);

    res.json({ success: true, data: keys, count: keys.length });
  } catch (error) {
    handleError(res, error, 'Error fetching distinct additional keys');
  }
};

export const bulkImport = async (req, res) => {
  try {
    const { entries } = req.body;
    
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Entries array is required and cannot be empty'
      });
    }

    if (entries.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Cannot import more than 1000 entries at once'
      });
    }

    const validationErrors = validateBulkEntries(entries);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors in bulk data',
        errors: validationErrors
      });
    }

    // Add metadata to entries
    const entriesWithMetadata = entries.map(entry => ({
      ...entry,
      metadata: {
        dateAdded: new Date(),
        lastUpdated: new Date(),
        verified: entry.metadata?.verified || false,
        source: entry.metadata?.source || 'bulk_import'
      }
    }));

    const results = await DiseaseData.insertMany(entriesWithMetadata, {
      ordered: false // Continue with other inserts even if some fail
    });

    res.json({
      success: true,
      message: `Successfully imported ${results.length} entries`,
      data: {
        inserted: results.length,
        total: entries.length,
        failed: entries.length - results.length
      }
    });
  } catch (error) {
    // Handle partial success in bulk operations
    if (error.result && error.result.insertedCount > 0) {
      return res.status(207).json({
        success: true,
        message: `Partially successful: imported ${error.result.insertedCount} entries`,
        data: {
          inserted: error.result.insertedCount,
          failed: error.writeErrors?.length || 0,
          errors: error.writeErrors?.map(err => err.errmsg) || []
        }
      });
    }
    
    handleError(res, error, 'Error during bulk import');
  }
};

export const exportEntries = async (req, res) => {
  try {
    const { format = 'json', disease, autoantibody, autoantigen, epitope, uniprotId, diseaseAssociation, affinity, sensitivity, diagnosticMarker, associationWithDiseaseActivity, pathogenesisInvolvement, reference, databaseAccessionNumbers, synonym, screening, confirmation, monitoring, positivePredictiveValues, negativePredictiveValues, crossReactivityPatterns, referenceRangesAndCutoffValues, type, limit } = req.query;
    
    let query = {};
    // Use exact matching (case-insensitive) for all filters
    if (disease) {
      const escapedValue = disease.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.disease = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (autoantibody) {
      const escapedValue = autoantibody.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.autoantibody = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (autoantigen) {
      const escapedValue = autoantigen.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.autoantigen = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (epitope) {
      const escapedValue = epitope.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.epitope = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (uniprotId) {
      const escapedValue = uniprotId.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.uniprotId = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (diseaseAssociation) {
      const escapedValue = diseaseAssociation.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.diseaseAssociation = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (affinity) {
      const escapedValue = affinity.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.affinity = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (sensitivity) {
      const escapedValue = sensitivity.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.sensitivity = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (diagnosticMarker) {
      const escapedValue = diagnosticMarker.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.diagnosticMarker = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (associationWithDiseaseActivity) {
      const escapedValue = associationWithDiseaseActivity.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.associationWithDiseaseActivity = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (pathogenesisInvolvement) {
      const escapedValue = pathogenesisInvolvement.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.pathogenesisInvolvement = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (reference) {
      const escapedValue = reference.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.reference = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (databaseAccessionNumbers) {
      const escapedValue = databaseAccessionNumbers.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.databaseAccessionNumbers = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (synonym) {
      const escapedValue = synonym.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.synonym = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (screening) {
      const escapedValue = screening.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.screening = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (confirmation) {
      const escapedValue = confirmation.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.confirmation = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (monitoring) {
      const escapedValue = monitoring.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.monitoring = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (positivePredictiveValues) {
      const escapedValue = positivePredictiveValues.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.positivePredictiveValues = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (negativePredictiveValues) {
      const escapedValue = negativePredictiveValues.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.negativePredictiveValues = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (crossReactivityPatterns) {
      const escapedValue = crossReactivityPatterns.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.crossReactivityPatterns = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (referenceRangesAndCutoffValues) {
      const escapedValue = referenceRangesAndCutoffValues.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.referenceRangesAndCutoffValues = new RegExp(`^${escapedValue}$`, 'i');
    }
    if (type) {
      const escapedValue = type.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.type = new RegExp(`^${escapedValue}$`, 'i');
    }

    // Sort by priority first (descending), then by disease and autoantibody
    const aggregationPipeline = [
      { $match: query },
      {
        $addFields: {
          priorityNum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$priority', null] },
                  { $ne: ['$priority', ''] },
                  { $ne: [{ $type: '$priority' }, 'missing'] }
                ]
              },
              {
                $cond: [
                  { $eq: [{ $type: '$priority' }, 'number'] },
                  '$priority',
                  {
                    $cond: [
                      { $eq: [{ $type: '$priority' }, 'string'] },
                      {
                        $cond: [
                          { $regexMatch: { input: '$priority', regex: /^-?\d+(\.\d+)?$/ } },
                          { $toDouble: '$priority' },
                          0
                        ]
                      },
                      0
                    ]
                  }
                ]
              },
              0
            ]
          }
        }
      },
      {
        $sort: {
          priorityNum: -1, // Higher priority first
          disease: 1,
          autoantibody: 1
        }
      },
      {
        $project: {
          priorityNum: 0 // Remove the temporary field (priority is included by default in exclusion projection)
        }
      }
    ];
    
    if (limit && parseInt(limit) > 0) {
      aggregationPipeline.push({ $limit: Math.min(parseInt(limit), 10000) });
    }
    
    const entries = await DiseaseData.aggregate(aggregationPipeline);

    if (format === 'csv') {
      const csv = convertToCSV(entries);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=disease_database.csv');
      return res.send(csv);
    }

    res.json({
      success: true,
      data: entries,
      count: entries.length,
      exportFormat: format,
      appliedFilters: { disease, autoantibody, autoantigen, epitope, uniprotId, diseaseAssociation, affinity, sensitivity, diagnosticMarker, associationWithDiseaseActivity, pathogenesisInvolvement, reference, databaseAccessionNumbers, synonym, screening, confirmation, monitoring, positivePredictiveValues, negativePredictiveValues, crossReactivityPatterns, referenceRangesAndCutoffValues, type }
    });
  } catch (error) {
    handleError(res, error, 'Error exporting entries');
  }
};

export const importFromFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const isCsv = req.file.originalname.toLowerCase().endsWith('.csv');
    const workbook = isCsv
      ? XLSX.read(req.file.buffer.toString('utf8'), { type: 'string' })
      : XLSX.read(req.file.buffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Uploaded file contains no rows' });
    }

    const normalizeHeader = (h) => h.toString().trim().toLowerCase().replace(/\s+/g, '');
    const fieldMap = {
      disease: ['disease', 'diseasename', 'disease_name', 'condition', 'disorder', 'syndrome'],
      databaseAccessionNumbers: ['databaseaccessionnumbers', 'database_accession_numbers', 'accession_numbers', 'db_accession', 'accession_nums', 'db_accession_numbers'],
      autoantibody: ['autoantibody', 'antibody', 'auto_antibody', 'antibody_name', 'auto_ab', 'ab'],
      synonym: ['synonym', 'synonyms', 'alternative_name', 'alt_name', 'other_name', 'alias'],
      diseaseAssociation: ['diseaseassociation', 'disease_association', 'association', 'disease_assoc', 'disease_relation', 'disease_relationship'],
      autoantigen: ['autoantigen', 'antigen', 'auto_antigen', 'antigen_name', 'target_antigen', 'target', 'auto_ag'],
      epitope: ['epitope', 'epitope_sequence', 'peptide', 'epitope_seq', 'binding_site', 'epitope_region'],
      epitopePrevalence: ['epitopeprevalence', 'epitope_prevalence', 'prevalence', 'epitope_frequency', 'frequency', 'epitope_rate'],
      uniprotId: ['uniprotid', 'uniprot', 'uniprot_id', 'uniprot_accession', 'accession', 'protein_id', 'uniprot_entry', 'protein_accession'],
      screening: ['screening', 'screening_method', 'screening_test', 'initial_test', 'screening_assay'],
      confirmation: ['confirmation', 'confirmation_method', 'confirmatory_test', 'confirmatory_assay', 'confirmatory_method'],
      monitoring: ['monitoring', 'monitoring_method', 'monitoring_test', 'follow_up_test', 'monitoring_assay'],
      affinity: ['affinity', 'binding_affinity', 'affinity_strength', 'binding_strength', 'kd'],
      avidity: ['avidity', 'binding_avidity', 'avidity_strength', 'overall_binding'],
      mechanism: ['mechanism', 'action_mechanism', 'mechanism_of_action', 'mode_of_action', 'action', 'moa'],
      isotypeSubclasses: ['isotypesubclasses', 'isotype_subclasses', 'isotype', 'antibody_isotype', 'isotype_class', 'antibody_class'],
      sensitivity: ['sensitivity', 'assay_sensitivity', 'test_sensitivity', 'diagnostic_sensitivity', 'analytical_sensitivity'],
      diagnosticMarker: ['diagnosticmarker', 'diagnostic_marker', 'marker', 'diagnostic_indicator', 'biomarker', 'diagnostic_flag'],
      associationWithDiseaseActivity: ['associationwithdiseaseactivity', 'association_with_disease_activity', 'disease_activity', 'activity_association', 'disease_correlation', 'activity_correlation'],
      positivePredictiveValues: ['positivepredictivevalues', 'positive_predictive_values', 'ppv', 'positive_predictive_value', 'positive_predictive'],
      negativePredictiveValues: ['negativepredictivevalues', 'negative_predictive_values', 'npv', 'negative_predictive_value', 'negative_predictive'],
      crossReactivityPatterns: ['crossreactivitypatterns', 'cross_reactivity_patterns', 'cross_reactivity', 'reactivity_patterns', 'cross_reaction'],
      pathogenesisInvolvement: ['pathogenesisinvolvement', 'pathogenesis_involvement', 'pathogenesis', 'pathogenic_role', 'disease_mechanism', 'pathogenic_mechanism'],
      referenceRangesAndCutoffValues: ['referencerangesandcutoffvalues', 'reference_ranges_and_cutoff_values', 'reference_ranges', 'cutoff_values', 'normal_ranges', 'reference_values'],
      reference: ['reference', 'ref', 'citation', 'source', 'publication', 'doi', 'pmid', 'pubmed_id', 'literature'],
      type: ['type', 'classification', 'category', 'class', 'antibody_type', 'immunoglobulin_type'],
      priority: ['priority', 'priority_level', 'priority_levels', 'importance', 'rank', 'priority_rank']
    };

    const mapRow = (row, rowIndex) => {
      const lowered = {};
      const originalHeaders = {}; // Store original headers for custom fields
      Object.keys(row).forEach((k) => {
        const normalized = normalizeHeader(k);
        lowered[normalized] = row[k];
        originalHeaders[normalized] = k; // Keep original header name
      });

      const getFirst = (keys, fieldName) => {
        for (const key of keys) {
          if (lowered[key] !== undefined && lowered[key] !== null && lowered[key].toString().trim() !== '') {
            console.log(`Row ${rowIndex + 1}: Mapped "${key}" to field "${fieldName}"`);
            return lowered[key];
          }
        }
        return '';
      };

      // Build base mapped record with all model fields
      const base = {
        disease: getFirst(fieldMap.disease, 'disease').toString().trim(),
        databaseAccessionNumbers: getFirst(fieldMap.databaseAccessionNumbers, 'databaseAccessionNumbers').toString().trim() || undefined,
        autoantibody: getFirst(fieldMap.autoantibody, 'autoantibody').toString().trim(),
        synonym: getFirst(fieldMap.synonym, 'synonym').toString().trim() || undefined,
        diseaseAssociation: getFirst(fieldMap.diseaseAssociation, 'diseaseAssociation').toString().trim() || undefined,
        autoantigen: getFirst(fieldMap.autoantigen, 'autoantigen').toString().trim(),
        epitope: getFirst(fieldMap.epitope, 'epitope').toString().trim(),
        epitopePrevalence: getFirst(fieldMap.epitopePrevalence, 'epitopePrevalence') || undefined,
        uniprotId: getFirst(fieldMap.uniprotId, 'uniprotId').toString().trim(),
        screening: getFirst(fieldMap.screening, 'screening').toString().trim() || undefined,
        confirmation: getFirst(fieldMap.confirmation, 'confirmation').toString().trim() || undefined,
        monitoring: getFirst(fieldMap.monitoring, 'monitoring').toString().trim() || undefined,
        affinity: getFirst(fieldMap.affinity, 'affinity').toString().trim() || undefined,
        avidity: getFirst(fieldMap.avidity, 'avidity').toString().trim() || undefined,
        mechanism: getFirst(fieldMap.mechanism, 'mechanism').toString().trim() || undefined,
        isotypeSubclasses: getFirst(fieldMap.isotypeSubclasses, 'isotypeSubclasses').toString().trim() || undefined,
        sensitivity: getFirst(fieldMap.sensitivity, 'sensitivity').toString().trim() || undefined,
        diagnosticMarker: getFirst(fieldMap.diagnosticMarker, 'diagnosticMarker').toString().trim() || undefined,
        associationWithDiseaseActivity: getFirst(fieldMap.associationWithDiseaseActivity, 'associationWithDiseaseActivity').toString().trim() || undefined,
        positivePredictiveValues: getFirst(fieldMap.positivePredictiveValues, 'positivePredictiveValues').toString().trim() || undefined,
        negativePredictiveValues: getFirst(fieldMap.negativePredictiveValues, 'negativePredictiveValues').toString().trim() || undefined,
        crossReactivityPatterns: getFirst(fieldMap.crossReactivityPatterns, 'crossReactivityPatterns').toString().trim() || undefined,
        pathogenesisInvolvement: getFirst(fieldMap.pathogenesisInvolvement, 'pathogenesisInvolvement').toString().trim() || undefined,
        referenceRangesAndCutoffValues: getFirst(fieldMap.referenceRangesAndCutoffValues, 'referenceRangesAndCutoffValues').toString().trim() || undefined,
        reference: getFirst(fieldMap.reference, 'reference').toString().trim() || undefined,
        type: getFirst(fieldMap.type, 'type').toString().trim() || undefined,
        priority: getFirst(fieldMap.priority, 'priority').toString().trim() || undefined
      };

      // Create a comprehensive set of all known field variations
      const knownKeys = new Set();
      Object.values(fieldMap).forEach(fieldVariations => {
        fieldVariations.forEach(variation => {
          knownKeys.add(variation);
        });
      });

      // Only capture truly unknown columns into additional with original header names
      const additional = {};
      const unmappedColumns = [];
      Object.entries(lowered).forEach(([normalizedKey, value]) => {
        if (!knownKeys.has(normalizedKey) && value !== undefined && value !== null && value.toString().trim() !== '') {
          const originalKey = originalHeaders[normalizedKey]; // Use original header name
          additional[originalKey] = value.toString();
          unmappedColumns.push(originalKey);
        }
      });

      // Log unmapped columns for debugging
      if (unmappedColumns.length > 0) {
        console.log(`Row ${rowIndex + 1}: Unmapped columns (stored in additional): ${unmappedColumns.join(', ')}`);
      }

      return { 
        ...base, 
        additional: Object.keys(additional).length ? additional : undefined 
      };
    };

    const entries = rawRows
      .map((row, index) => mapRow(row, index))
      .filter(e => {
        // Check if all required fields have valid values (not empty strings, null, or undefined)
        const hasValidDisease = e.disease && e.disease.toString().trim().length > 0;
        const hasValidAutoantibody = e.autoantibody && e.autoantibody.toString().trim().length > 0;
        const hasValidAutoantigen = e.autoantigen && e.autoantigen.toString().trim().length > 0;
        const hasValidEpitope = e.epitope && e.epitope.toString().trim().length > 0;
        const hasValidUniprotId = e.uniprotId && e.uniprotId.toString().trim().length > 0;
        
        const isValid = hasValidDisease && hasValidAutoantibody && hasValidAutoantigen && hasValidEpitope && hasValidUniprotId;
        
        if (!isValid) {
          console.log(`Row filtered out - Missing required fields:`, {
            disease: hasValidDisease ? '✓' : '✗',
            autoantibody: hasValidAutoantibody ? '✓' : '✗',
            autoantigen: hasValidAutoantigen ? '✓' : '✗',
            epitope: hasValidEpitope ? '✓' : '✗',
            uniprotId: hasValidUniprotId ? '✓' : '✗'
          });
        }
        
        return isValid;
      });

    if (entries.length === 0) {
      // Get column information for better error reporting
      const originalHeaders = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
      const normalizedHeaders = originalHeaders.map(h => normalizeHeader(h));
      
      // Check which required fields were found
      const requiredFields = ['disease', 'autoantibody', 'autoantigen', 'epitope', 'uniprotid'];
      const foundRequiredFields = [];
      const missingRequiredFields = [];
      
      requiredFields.forEach(field => {
        const variations = fieldMap[field === 'uniprotid' ? 'uniprotId' : field];
        const found = variations.some(variation => normalizedHeaders.includes(variation));
        if (found) {
          foundRequiredFields.push(field);
        } else {
          missingRequiredFields.push(field);
        }
      });
      
      return res.status(400).json({ 
        success: false, 
        message: 'No valid rows found after mapping required fields. Please check your file format and column names.',
        details: {
          totalRows: rawRows.length,
          validRows: entries.length,
          requiredFields: ['Disease', 'Autoantibody', 'Autoantigen', 'Epitope', 'UniProt ID'],
          foundColumns: originalHeaders,
          foundRequiredFields: foundRequiredFields,
          missingRequiredFields: missingRequiredFields,
          suggestions: [
            'Ensure your file has a header row with column names',
            'Check that required columns are present: Disease, Autoantibody, Autoantigen, Epitope, UniProt ID',
            'Verify that all required fields have data (not empty)',
            'Column names are case-insensitive and flexible (e.g., "Disease", "disease", "DISEASE")'
          ]
        }
      });
    }

    // Log import summary
    console.log(`\n=== Import Summary ===`);
    console.log(`Total rows processed: ${rawRows.length}`);
    console.log(`Valid entries after mapping: ${entries.length}`);
    console.log(`Rows filtered out: ${rawRows.length - entries.length}`);
    
    // Log column mapping information
    if (rawRows.length > 0) {
      const firstRow = rawRows[0];
      const originalHeaders = Object.keys(firstRow);
      console.log(`\n=== Column Mapping ===`);
      console.log(`Original headers found: ${originalHeaders.join(', ')}`);
      
      const normalizedHeaders = originalHeaders.map(h => normalizeHeader(h));
      console.log(`Normalized headers: ${normalizedHeaders.join(', ')}`);
      
      // Check which required fields were found
      const requiredFields = ['disease', 'autoantibody', 'autoantigen', 'epitope', 'uniprotid'];
      const foundRequiredFields = [];
      const missingRequiredFields = [];
      
      requiredFields.forEach(field => {
        const variations = fieldMap[field === 'uniprotid' ? 'uniprotId' : field];
        const found = variations.some(variation => normalizedHeaders.includes(variation));
        if (found) {
          foundRequiredFields.push(field);
        } else {
          missingRequiredFields.push(field);
        }
      });
      
      console.log(`Found required fields: ${foundRequiredFields.join(', ')}`);
      if (missingRequiredFields.length > 0) {
        console.log(`Missing required fields: ${missingRequiredFields.join(', ')}`);
        console.log(`This is likely why no valid rows were found.`);
      }
    }
    
    // Show field mapping statistics
    const fieldStats = {};
    entries.forEach(entry => {
      Object.keys(entry).forEach(key => {
        if (key !== 'additional' && entry[key] !== undefined && entry[key] !== null && entry[key] !== '') {
          fieldStats[key] = (fieldStats[key] || 0) + 1;
        }
      });
    });
    
    console.log('Field mapping statistics:');
    Object.entries(fieldStats).forEach(([field, count]) => {
      console.log(`  ${field}: ${count}/${entries.length} entries (${((count/entries.length)*100).toFixed(1)}%)`);
    });

    const validationErrors = validateBulkEntries(entries);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation errors in file data', errors: validationErrors });
    }

    const entriesWithMetadata = entries.map((entry) => ({
      ...entry,
      metadata: {
        dateAdded: new Date(),
        lastUpdated: new Date(),
        verified: false,
        source: 'file_import'
      }
    }));

    const results = await DiseaseData.insertMany(entriesWithMetadata, { ordered: false });

    return res.json({
      success: true,
      message: `Imported ${results.length} entries`,
      data: { inserted: results.length, total: entriesWithMetadata.length, failed: entriesWithMetadata.length - results.length }
    });
  } catch (error) {
    if (error.result && error.result.insertedCount >= 0) {
      return res.status(207).json({
        success: true,
        message: `Partially successful: imported ${error.result.insertedCount} entries`,
        data: {
          inserted: error.result.insertedCount,
          failed: error.writeErrors?.length || 0,
          errors: error.writeErrors?.map((e) => e.errmsg) || []
        }
      });
    }
    return handleError(res, error, 'Error importing from file');
  }
};

// New controller methods to support static methods from the model

export const getDiseasesSummary = async (req, res) => {
  try {
    const summary = await DiseaseData.getDiseasesSummary();
    
    res.json({
      success: true,
      data: summary,
      count: summary.length
    });
  } catch (error) {
    handleError(res, error, 'Error fetching diseases summary');
  }
};

export const findByDiseaseAndAutoantibody = async (req, res) => {
  try {
    const { disease, autoantibody } = req.query;
    
    if (!disease || !autoantibody) {
      return res.status(400).json({
        success: false,
        message: 'Both disease and autoantibody parameters are required'
      });
    }

    const entries = await DiseaseData.findByDiseaseAndAutoantibody(disease, autoantibody);
    
    res.json({
      success: true,
      data: entries,
      count: entries.length,
      searchParams: { disease, autoantibody }
    });
  } catch (error) {
    handleError(res, error, 'Error searching by disease and autoantibody');
  }
};

export const findByAutoantibodyOrSynonym = async (req, res) => {
  try {
    const { searchTerm } = req.query;
    
    if (!searchTerm || searchTerm.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const entries = await DiseaseData.findByAutoantibodyOrSynonym(searchTerm.trim());
    
    res.json({
      success: true,
      data: entries,
      count: entries.length,
      searchTerm: searchTerm.trim()
    });
  } catch (error) {
    handleError(res, error, 'Error searching by autoantibody or synonym');
  }
};

export const findByDiagnosticMethod = async (req, res) => {
  try {
    const { method } = req.query;
    
    if (!method || method.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Diagnostic method is required'
      });
    }

    const entries = await DiseaseData.findByDiagnosticMethod(method.trim());
    
    res.json({
      success: true,
      data: entries,
      count: entries.length,
      diagnosticMethod: method.trim()
    });
  } catch (error) {
    handleError(res, error, 'Error searching by diagnostic method');
  }
};