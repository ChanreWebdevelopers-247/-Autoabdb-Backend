// /routes/userRoutes.js
import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserPassword,
  toggleUserStatus,
  deleteUser,
  getUsersByRole,
  getUserStats
} from '../controllers/userController.js';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateJWT);

// GET routes - Order matters! More specific routes should come BEFORE general ones

// Get user statistics (Admin and superAdmin only)
router.get('/stats', 
  authorizeRoles('Admin', 'superAdmin'), 
  getUserStats
);

// Get users by role (Admin and superAdmin only)
router.get('/role/:role', 
  authorizeRoles('Admin', 'superAdmin'), 
  getUsersByRole
);

// Get all users with pagination and filtering (Admin and superAdmin only)
router.get('/', 
  authorizeRoles('Admin', 'superAdmin'), 
  getAllUsers
);

// Get user by ID (Admin and superAdmin only) - This should be LAST among GET routes
router.get('/:id', 
  authorizeRoles('Admin', 'superAdmin'), 
  getUserById
);

// POST routes
// Create new user (Admin and superAdmin only)
router.post('/', 
  authorizeRoles('Admin', 'superAdmin'), 
  createUser
);

// PUT routes
// Update user password (Admin and superAdmin only) - More specific route first
router.put('/:id/password', 
  authorizeRoles('Admin', 'superAdmin'), 
  updateUserPassword
);

// Toggle user active status (Admin and superAdmin only) - More specific route first
router.put('/:id/toggle-status', 
  authorizeRoles('Admin', 'superAdmin'), 
  toggleUserStatus
);

// Update user (Admin and superAdmin only) - General route last
router.put('/:id', 
  authorizeRoles('Admin', 'superAdmin'), 
  updateUser
);

// DELETE routes
// Delete user (soft delete by default, permanent with ?permanent=true)
// Only superAdmin can permanently delete, Admin can soft delete
router.delete('/:id', (req, res, next) => {
  const { permanent } = req.query;
  if (permanent === 'true') {
    return authorizeRoles('superAdmin')(req, res, next);
  } else {
    return authorizeRoles('Admin', 'superAdmin')(req, res, next);
  }
}, deleteUser);

export default router;