import express from 'express';
import multer from 'multer';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  searchBiomarkers,
  bulkBiomarkers,
  getAllBiomarkers,
  importFromFile,
  importFromServerFile,
  deleteAllBiomarkers,
  exportBiomarkers,
} from '../controllers/biomarkerController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// Public routes (for index page, biomarkers page, network graph)
router.get('/', searchBiomarkers);
router.post('/bulk', bulkBiomarkers);

// Protected routes (for import page - superAdmin, Admin, Doctor)
router.get('/list', authenticateJWT, authorizeRoles('superAdmin', 'Admin', 'Doctor'), getAllBiomarkers);
router.get('/export', authenticateJWT, authorizeRoles('superAdmin', 'Admin', 'Doctor'), exportBiomarkers);
router.post('/import/file', authenticateJWT, authorizeRoles('superAdmin', 'Admin', 'Doctor'), upload.single('file'), importFromFile);
router.post('/import/server-file', authenticateJWT, authorizeRoles('superAdmin', 'Admin', 'Doctor'), importFromServerFile);
router.delete('/all', authenticateJWT, authorizeRoles('superAdmin', 'Admin', 'Doctor'), deleteAllBiomarkers);

export default router;
