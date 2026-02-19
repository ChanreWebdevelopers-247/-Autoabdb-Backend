import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Get all users with pagination and filtering
export const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (role) {
      filter.role = role;
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { contactNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query
    const users = await User.find(filter)
      .select('-password -resetPasswordToken')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / parseInt(limit));

    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const user = await User.findById(id).select('-password -resetPasswordToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Create new user
export const createUser = async (req, res) => {
  try {
    const {
      name,
      username,
      email,
      password,
      role,
      contactNumber,
      consultationCharges
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists`
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user object
    const userData = {
      name,
      username,
      email,
      password: hashedPassword,
      role,
      contactNumber
    };

    // Add consultation charges only for doctors
    if (role === 'Doctor' && consultationCharges) {
      userData.consultationCharges = consultationCharges;
    }

    const user = await User.create(userData);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetPasswordToken;

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: userResponse }
    });

  } catch (error) {
    console.error('Create user error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Remove fields that shouldn't be updated directly
    const restrictedFields = ['password', 'resetPasswordToken', 'resetPasswordExpires'];
    restrictedFields.forEach(field => delete updates[field]);

    // Check if email or username is being updated and already exists
    if (updates.email || updates.username) {
      const query = {
        _id: { $ne: id },
        $or: []
      };

      if (updates.email) {
        query.$or.push({ email: updates.email });
      }
      if (updates.username) {
        query.$or.push({ username: updates.username });
      }

      const existingUser = await User.findOne(query);
      if (existingUser) {
        const field = existingUser.email === updates.email ? 'email' : 'username';
        return res.status(400).json({
          success: false,
          message: `Another user with this ${field} already exists`
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { 
        new: true, 
        runValidators: true,
        select: '-password -resetPasswordToken'
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Update user error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update user password
export const updateUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await User.findByIdAndUpdate(id, { password: hashedNewPassword });

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Update user password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Toggle user active status
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const user = await User.findById(id).select('-password -resetPasswordToken');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Toggle the status
    user.isActive = !user.isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user }
    });

  } catch (error) {
    console.error('Toggle user status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete user (soft delete - set isActive to false)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    if (permanent === 'true') {
      // Permanent delete
      const user = await User.findByIdAndDelete(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'User permanently deleted successfully'
      });
    } else {
      // Soft delete - set isActive to false
      const user = await User.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true, select: '-password -resetPasswordToken' }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'User deactivated successfully',
        data: { user }
      });
    }

  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get users by role
export const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const { isActive = true, page = 1, limit = 10 } = req.query;

    // Validate role
    const validRoles = ['Admin', 'Doctor', 'Receptionist', 'Accountant', 'superAdmin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    const filter = { role };
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(filter)
      .select('-password -resetPasswordToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / parseInt(limit));

    return res.status(200).json({
      success: true,
      message: `${role}s retrieved successfully`,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get users by role error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get user statistics
export const getUserStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          inactive: { $sum: { $cond: ['$isActive', 0, 1] } }
        }
      },
      {
        $project: {
          role: '$_id',
          count: 1,
          active: 1,
          inactive: 1,
          _id: 0
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });

    return res.status(200).json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: {
        overview: {
          totalUsers,
          activeUsers,
          inactiveUsers
        },
        roleStats: stats
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};