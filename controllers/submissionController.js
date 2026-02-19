import DiseaseData from '../models/diseaseModel.js';
import DiseaseSubmission from '../models/diseaseSubmissionModel.js';
import mongoose from 'mongoose';

// Create a new disease submission (any authenticated user)
export const createSubmission = async (req, res) => {
  try {
    const required = ['disease', 'autoantibody', 'autoantigen', 'epitope', 'uniprotId'];
    for (const field of required) {
      if (!req.body[field] || !req.body[field].toString().trim()) {
        return res.status(400).json({ success: false, message: `${field} is required` });
      }
    }

    const submission = await DiseaseSubmission.create({
      ...req.body,
      submittedBy: req.user?.id || req.user?._id,
      metadata: {
        ...(req.body.metadata || {}),
        source: 'user_submission',
        dateAdded: new Date(),
        lastUpdated: new Date(),
        verified: false
      }
    });

    return res.status(201).json({ success: true, message: 'Submission created', data: submission });
  } catch (error) {
    console.error('Create submission error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// List submissions
// superAdmin: can see all with filters
// others: see only their own submissions
export const listSubmissions = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (req.user.role !== 'superAdmin') {
      filter.submittedBy = req.user.id || req.user._id;
    }
    if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      DiseaseSubmission.find(filter)
        .populate('submittedBy', 'name username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      DiseaseSubmission.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('List submissions error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Approve a submission and insert into diseaseData
export const approveSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid submission ID' });
    }

    const submission = await DiseaseSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }
    if (submission.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Submission already approved' });
    }

    // Copy fields into DiseaseData
    const {
      disease,
      autoantibody,
      diseaseAssociation,
      autoantigen,
      epitope,
      epitopePrevalence,
      uniprotId,
      affinity,
      avidity,
      mechanism,
      isotypeSubclasses,
      sensitivity,
      diagnosticMarker,
      associationWithDiseaseActivity,
      pathogenesisInvolvement,
      reference,
      additional
    } = submission.toObject();

    const created = await DiseaseData.create({
      disease,
      autoantibody,
      diseaseAssociation,
      autoantigen,
      epitope,
      epitopePrevalence,
      uniprotId,
      affinity,
      avidity,
      mechanism,
      isotypeSubclasses,
      sensitivity,
      diagnosticMarker,
      associationWithDiseaseActivity,
      pathogenesisInvolvement,
      reference,
      additional,
      metadata: {
        source: 'user_submission_approved',
        dateAdded: new Date(),
        lastUpdated: new Date(),
        verified: true,
        dataVersion: '1.0'
      }
    });

    submission.status = 'approved';
    submission.reviewedBy = req.user.id || req.user._id;
    submission.reviewedAt = new Date();
    submission.reviewNote = req.body?.reviewNote;
    await submission.save();

    return res.status(200).json({ success: true, message: 'Submission approved and added to diseaseData', data: { submission, created } });
  } catch (error) {
    console.error('Approve submission error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Reject a submission
export const rejectSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid submission ID' });
    }

    const submission = await DiseaseSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }
    if (submission.status === 'rejected') {
      return res.status(400).json({ success: false, message: 'Submission already rejected' });
    }

    submission.status = 'rejected';
    submission.reviewedBy = req.user.id || req.user._id;
    submission.reviewedAt = new Date();
    submission.reviewNote = req.body?.reviewNote;
    await submission.save();

    return res.status(200).json({ success: true, message: 'Submission rejected', data: submission });
  } catch (error) {
    console.error('Reject submission error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


