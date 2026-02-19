// /routes/articleRoutes.js
import express from 'express';
import {
  getAllArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  getArticlesByAuthor,
  getPublishedArticles,
  searchArticles,
  toggleFeatured,
  publishArticle,
  getArticleStats,
  incrementViews
} from '../controllers/articleController.js';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/public', getPublishedArticles);
router.get('/public/search', searchArticles);
router.get('/public/:id', getArticleById);
router.put('/public/:id/views', incrementViews);

// Apply authentication middleware to all other routes
router.use(authenticateJWT);

// GET routes - Order matters! More specific routes should come BEFORE general ones

// Get article statistics (Admin and superAdmin only)
router.get('/stats', 
  authorizeRoles('Admin', 'superAdmin'), 
  getArticleStats
);

// Get articles by author
router.get('/author/:authorId', getArticlesByAuthor);

// Search articles (authenticated users)
router.get('/search', searchArticles);

// Get all articles with pagination and filtering
router.get('/', getAllArticles);

// POST routes - Should come before parameterized routes
// Create new article (authenticated users)
router.post('/', createArticle);

// Get article by ID or slug (should be LAST among GET routes)
router.get('/:id', getArticleById);

// PUT routes
// Publish article (author or Admin/superAdmin)
router.put('/:id/publish', publishArticle);

// Toggle featured status (Admin and superAdmin only)
router.put('/:id/featured', 
  authorizeRoles('Admin', 'superAdmin'), 
  toggleFeatured
);

// Increment views
router.put('/:id/views', incrementViews);

// Update article (author or Admin/superAdmin)
router.put('/:id', updateArticle);

// DELETE routes
// Delete article (soft delete by default, permanent with ?permanent=true)
// Only superAdmin can permanently delete, Admin/author can soft delete
router.delete('/:id', (req, res, next) => {
  const { permanent } = req.query;
  if (permanent === 'true') {
    return authorizeRoles('superAdmin')(req, res, next);
  } else {
    // Allow author, Admin, and superAdmin for soft delete
    return next();
  }
}, deleteArticle);

export default router;
