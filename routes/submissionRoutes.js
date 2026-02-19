import express from 'express';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware.js';
import { createSubmission, listSubmissions, approveSubmission, rejectSubmission } from '../controllers/submissionController.js';

const router = express.Router();

// Auth required for all submission routes
router.use(authenticateJWT);

// Create new submission (any logged-in user)
router.post('/', createSubmission);

// List submissions (superAdmin sees all; others only their own inside controller)
router.get('/', listSubmissions);

// Approve / Reject - superAdmin only
router.post('/:id/approve', authorizeRoles('superAdmin'), approveSubmission);
router.post('/:id/reject', authorizeRoles('superAdmin'), rejectSubmission);

export default router;


