import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    index: true,
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  abstract: {
    type: String,
    required: false,
    trim: true,
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
  },
  type: {
    type: String,
    enum: {
      values: ['article', 'journal', 'research', 'review', 'case-study'],
      message: '{VALUE} is not a valid article type',
    },
    default: 'article',
    required: true,
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
    index: true,
  },
  coAuthors: [{
    type: String,
    trim: true,
  }],
  status: {
    type: String,
    enum: {
      values: ['draft', 'published', 'archived', 'under-review'],
      message: '{VALUE} is not a valid status',
    },
    default: 'draft',
    index: true,
  },
  journalName: {
    type: String,
    required: false,
    trim: true,
  },
  journalVolume: {
    type: String,
    required: false,
    trim: true,
  },
  journalIssue: {
    type: String,
    required: false,
    trim: true,
  },
  doi: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    trim: true,
    match: [/^10\.\d{4,}\/[-._;()\/:a-zA-Z0-9]+$/, 'Please enter a valid DOI'],
  },
  keywords: [{
    type: String,
    trim: true,
  }],
  tags: [{
    type: String,
    trim: true,
  }],
  category: {
    type: String,
    required: false,
    trim: true,
    index: true,
  },
  featuredImage: {
    type: String,
    required: false,
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  publicationDate: {
    type: Date,
    required: false,
    index: true,
  },
  views: {
    type: Number,
    default: 0,
  },
  likes: {
    type: Number,
    default: 0,
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true,
  },
  isPublished: {
    type: Boolean,
    default: false,
    index: true,
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  publishedAt: {
    type: Date,
    required: false,
  },
  metaDescription: {
    type: String,
    required: false,
    trim: true,
    maxlength: [160, 'Meta description should not exceed 160 characters'],
  },
  references: [{
    type: String,
    trim: true,
  }],
  relatedArticles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes for better search performance
articleSchema.index({ title: 'text', abstract: 'text', content: 'text', keywords: 'text' });
articleSchema.index({ author: 1, status: 1 });
articleSchema.index({ type: 1, status: 1 });
articleSchema.index({ publicationDate: -1 });
articleSchema.index({ views: -1 });

// Virtual for reading time estimation (assuming 200 words per minute)
articleSchema.virtual('readingTime').get(function() {
  const wordsPerMinute = 200;
  const wordCount = this.content ? this.content.split(/\s+/).length : 0;
  return Math.ceil(wordCount / wordsPerMinute);
});

// Pre-save middleware to generate slug from title
articleSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Pre-save middleware to set publishedAt when status changes to published
articleSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published') {
    if (!this.publishedAt) {
      this.publishedAt = new Date();
    }
    this.isPublished = true;
    // Note: publishedBy should be set in controller, not here
  }
  if (this.status !== 'published') {
    this.isPublished = false;
  }
  next();
});

const Article = mongoose.model('Article', articleSchema);

export default Article;
