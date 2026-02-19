import Article from '../models/articleModel.js';
import mongoose from 'mongoose';

// Get all articles with pagination and filtering
export const getAllArticles = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      category,
      author,
      isPublished,
      isFeatured,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (type) {
      filter.type = type;
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (author) {
      filter.author = { $regex: author, $options: 'i' }; // Case-insensitive search by author name
    }
    
    if (isPublished !== undefined) {
      filter.isPublished = isPublished === 'true';
    }
    
    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured === 'true';
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { abstract: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { keywords: { $in: [new RegExp(search, 'i')] } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query
    const articles = await Article.find(filter)
      .populate('publishedBy', 'name username email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const totalArticles = await Article.countDocuments(filter);
    const totalPages = Math.ceil(totalArticles / parseInt(limit));

    return res.status(200).json({
      success: true,
      message: 'Articles retrieved successfully',
      data: {
        articles,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalArticles,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all articles error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get article by ID or slug
export const getArticleById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if it's a slug or ObjectId
    let article;
    if (mongoose.Types.ObjectId.isValid(id)) {
      article = await Article.findById(id)
        .populate('publishedBy', 'name username email')
        .populate('relatedArticles', 'title slug');
    } else {
      article = await Article.findOne({ slug: id })
        .populate('publishedBy', 'name username email')
        .populate('relatedArticles', 'title slug');
    }

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Increment views if article is published
    if (article.isPublished) {
      article.views += 1;
      await article.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Article retrieved successfully',
      data: { article }
    });

  } catch (error) {
    console.error('Get article by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Create new article
export const createArticle = async (req, res) => {
  try {
    const {
      title,
      abstract,
      content,
      type,
      author,
      coAuthors,
      status,
      journalName,
      journalVolume,
      journalIssue,
      doi,
      keywords,
      tags,
      category,
      featuredImage,
      attachments,
      publicationDate,
      metaDescription,
      references,
      relatedArticles
    } = req.body;

    // Validate authentication
    const publishedBy = req.user?.id || req.user?._id;
    if (!publishedBy) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to create articles'
      });
    }

    // Validate author is provided
    if (!author || !author.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Author name is required'
      });
    }

    // Create article object
    const articleData = {
      title,
      abstract,
      content,
      type: type || 'article',
      author: author.trim(), // Author name entered by user
      status: status || 'draft',
      journalName,
      journalVolume,
      journalIssue,
      doi,
      keywords: keywords || [],
      tags: tags || [],
      category,
      featuredImage,
      attachments: attachments || [],
      publicationDate,
      metaDescription,
      references: references || [],
      relatedArticles: relatedArticles || []
    };

    // Set publishedBy to authenticated user if status is published
    if (status === 'published') {
      articleData.publishedBy = publishedBy; // The user who is publishing
      articleData.publishedAt = new Date();
      articleData.isPublished = true;
    }

    // Add co-authors if provided (as strings/names)
    if (coAuthors && Array.isArray(coAuthors)) {
      articleData.coAuthors = coAuthors
        .filter(name => name && typeof name === 'string' && name.trim().length > 0)
        .map(name => name.trim());
    }

    const article = await Article.create(articleData);

    // Populate publishedBy for response
    await article.populate('publishedBy', 'name username email');

    return res.status(201).json({
      success: true,
      message: 'Article created successfully',
      data: { article }
    });

  } catch (error) {
    console.error('Create article error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update article
export const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid article ID format'
      });
    }

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Check if user is the publisher or admin/superAdmin
    const userId = req.user?.id || req.user?._id;
    const userRole = req.user?.role;
    const isPublisher = article.publishedBy && article.publishedBy.toString() === userId.toString();
    const isAdmin = ['Admin', 'superAdmin'].includes(userRole);

    if (!isPublisher && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only update articles you published or have admin access'
      });
    }

    // Remove fields that shouldn't be updated directly
    const restrictedFields = ['views', 'likes'];
    restrictedFields.forEach(field => delete updates[field]);

    // Handle status change to published
    if (updates.status === 'published' && article.status !== 'published') {
      updates.publishedAt = new Date();
      updates.isPublished = true;
      // Set publishedBy to the user who is publishing (could be different from author)
      updates.publishedBy = userId;
    }

    // Handle DOI uniqueness check
    if (updates.doi && updates.doi !== article.doi) {
      const existingArticle = await Article.findOne({ doi: updates.doi });
      if (existingArticle && existingArticle._id.toString() !== id) {
        return res.status(400).json({
          success: false,
          message: 'An article with this DOI already exists'
        });
      }
    }

    // Handle coAuthors if provided in updates
    if (updates.coAuthors && Array.isArray(updates.coAuthors)) {
      updates.coAuthors = updates.coAuthors
        .filter(name => name && typeof name === 'string' && name.trim().length > 0)
        .map(name => name.trim());
    }

    // Handle author update if provided
    if (updates.author && typeof updates.author === 'string') {
      updates.author = updates.author.trim();
    }

    const updatedArticle = await Article.findByIdAndUpdate(
      id,
      { $set: updates },
      { 
        new: true, 
        runValidators: true
      }
    )
      .populate('publishedBy', 'name username email');

    return res.status(200).json({
      success: true,
      message: 'Article updated successfully',
      data: { article: updatedArticle }
    });

  } catch (error) {
    console.error('Update article error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete article
export const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid article ID format'
      });
    }

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Check if user is the publisher or admin/superAdmin
    const userId = req.user?.id || req.user?._id;
    const userRole = req.user?.role;
    const isPublisher = article.publishedBy && article.publishedBy.toString() === userId.toString();
    const isAdmin = ['Admin', 'superAdmin'].includes(userRole);

    if (!isPublisher && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete articles you published or have admin access'
      });
    }

    if (permanent === 'true') {
      // Permanent delete (only superAdmin)
      if (userRole !== 'superAdmin') {
        return res.status(403).json({
          success: false,
          message: 'Only superAdmin can permanently delete articles'
        });
      }
      await Article.findByIdAndDelete(id);
      return res.status(200).json({
        success: true,
        message: 'Article permanently deleted successfully'
      });
    } else {
      // Soft delete - set status to archived
      const updatedArticle = await Article.findByIdAndUpdate(
        id,
        { status: 'archived' },
        { new: true }
      );
      return res.status(200).json({
        success: true,
        message: 'Article archived successfully',
        data: { article: updatedArticle }
      });
    }

  } catch (error) {
    console.error('Delete article error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get articles by author name
export const getArticlesByAuthor = async (req, res) => {
  try {
    const { authorName } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      status,
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    if (!authorName || !authorName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Author name is required'
      });
    }

    const filter = { author: { $regex: authorName.trim(), $options: 'i' } };
    
    if (status) {
      filter.status = status;
    }
    
    if (type) {
      filter.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const articles = await Article.find(filter)
      .populate('publishedBy', 'name username email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const totalArticles = await Article.countDocuments(filter);
    const totalPages = Math.ceil(totalArticles / parseInt(limit));

    return res.status(200).json({
      success: true,
      message: 'Articles retrieved successfully',
      data: {
        articles,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalArticles,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get articles by author error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get published articles (public endpoint)
export const getPublishedArticles = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      search,
      sortBy = 'publicationDate',
      sortOrder = 'desc'
    } = req.query;

    const filter = {
      status: 'published',
      isPublished: true
    };
    
    if (type) {
      filter.type = type;
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { abstract: { $regex: search, $options: 'i' } },
        { keywords: { $in: [new RegExp(search, 'i')] } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const articles = await Article.find(filter)
      .populate('author', 'name username email')
      .select('-content') // Don't send full content in list view
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const totalArticles = await Article.countDocuments(filter);
    const totalPages = Math.ceil(totalArticles / parseInt(limit));

    return res.status(200).json({
      success: true,
      message: 'Published articles retrieved successfully',
      data: {
        articles,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalArticles,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get published articles error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Search articles
export const searchArticles = async (req, res) => {
  try {
    const { q, type, category, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const filter = {
      $text: { $search: q },
      status: 'published',
      isPublished: true
    };

    if (type) {
      filter.type = type;
    }

    if (category) {
      filter.category = category;
    }

    const articles = await Article.find(filter, { score: { $meta: 'textScore' } })
      .populate('publishedBy', 'name username email')
      .sort({ score: { $meta: 'textScore' } })
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: {
        articles,
        query: q,
        count: articles.length
      }
    });

  } catch (error) {
    console.error('Search articles error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Toggle featured status
export const toggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid article ID format'
      });
    }

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    article.isFeatured = !article.isFeatured;
    await article.save();

    return res.status(200).json({
      success: true,
      message: `Article ${article.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      data: { article }
    });

  } catch (error) {
    console.error('Toggle featured error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Publish article
export const publishArticle = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid article ID format'
      });
    }

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    const userId = req.user?.id || req.user?._id;

    article.status = 'published';
    article.isPublished = true;
    article.publishedAt = new Date();
    article.publishedBy = userId;

    await article.save();
    await article.populate('publishedBy', 'name username email');

    return res.status(200).json({
      success: true,
      message: 'Article published successfully',
      data: { article }
    });

  } catch (error) {
    console.error('Publish article error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get article statistics
export const getArticleStats = async (req, res) => {
  try {
    const stats = await Article.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          published: { $sum: { $cond: ['$isPublished', 1, 0] } },
          draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
          featured: { $sum: { $cond: ['$isFeatured', 1, 0] } },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' }
        }
      },
      {
        $project: {
          type: '$_id',
          count: 1,
          published: 1,
          draft: 1,
          featured: 1,
          totalViews: 1,
          totalLikes: 1,
          _id: 0
        }
      }
    ]);

    const totalArticles = await Article.countDocuments();
    const publishedArticles = await Article.countDocuments({ isPublished: true });
    const draftArticles = await Article.countDocuments({ status: 'draft' });
    const featuredArticles = await Article.countDocuments({ isFeatured: true });
    const totalViews = await Article.aggregate([
      { $group: { _id: null, total: { $sum: '$views' } } }
    ]);
    const totalLikes = await Article.aggregate([
      { $group: { _id: null, total: { $sum: '$likes' } } }
    ]);

    return res.status(200).json({
      success: true,
      message: 'Article statistics retrieved successfully',
      data: {
        overview: {
          totalArticles,
          publishedArticles,
          draftArticles,
          featuredArticles,
          totalViews: totalViews[0]?.total || 0,
          totalLikes: totalLikes[0]?.total || 0
        },
        typeStats: stats
      }
    });

  } catch (error) {
    console.error('Get article stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Increment article views
export const incrementViews = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid article ID format'
      });
    }

    const article = await Article.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Views incremented successfully',
      data: { views: article.views }
    });

  } catch (error) {
    console.error('Increment views error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
