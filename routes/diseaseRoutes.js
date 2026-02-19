// diseaseRoutes.js - Updated with new filtering endpoints

import express from 'express';
import multer from 'multer';
import {
  getAllEntries,
  getEntryById,
  createEntry,
  updateEntry,
  deleteEntry,
  searchEntries,
  advancedSearch,
  getEntriesByDisease,
  getEntriesByUniprotId,
  getUniqueValues,
  getFilteredUniqueValues,
  getStatistics,
  getDistinctAdditionalKeys,
  bulkImport,
  exportEntries,
  importFromFile
} from '../controllers/diseaseController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Main CRUD routes
router.get('/', getAllEntries);
// Additional info helpers must appear before parameterized routes
router.get('/additional/keys', getDistinctAdditionalKeys);
router.get('/:id', getEntryById);
router.post('/', createEntry);
router.put('/:id', updateEntry);
router.delete('/:id', deleteEntry);

// Search routes
router.get('/search/entries', searchEntries);
router.get('/search/advanced', advancedSearch);

// Filter routes
router.get('/disease/:disease', getEntriesByDisease);
router.get('/uniprot/:uniprotId', getEntriesByUniprotId);

// Unique values routes
router.get('/unique/:field', getUniqueValues);
router.get('/unique-filtered/:field', getFilteredUniqueValues);

// Statistics and analytics routes
router.get('/statistics/overview', getStatistics);

// Bulk operations
router.post('/bulk/import', bulkImport);
router.get('/export/data', exportEntries);
router.post('/import/file', upload.single('file'), importFromFile);

export default router;