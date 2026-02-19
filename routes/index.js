// /routes/index.js
import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import diseaseRoutes from './diseaseRoutes.js';
import biomarkerRoutes from './biomarkerRoutes.js';
import submissionRoutes from './submissionRoutes.js';
import articleRoutes from './articleRoutes.js';


const router = express.Router();

// Mount the routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/disease', diseaseRoutes);
router.use('/biomarkers', biomarkerRoutes);
router.use('/submissions', submissionRoutes);
router.use('/articles', articleRoutes);




export default router;