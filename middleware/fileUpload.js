// middleware/fileUpload.js - File upload middleware with validation

import multer from 'multer';

// Configure multer for file uploads
export const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file at a time
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV and Excel files
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/csv',
      'text/x-csv',
      'application/x-csv',
      'text/comma-separated-values',
      'text/x-comma-separated-values'
    ];
    
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.originalname.toLowerCase().substr(file.originalname.lastIndexOf('.'));
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'), false);
    }
  }
});

// Error handling middleware for file upload
export const handleUploadErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.',
          error: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Only one file is allowed.',
          error: 'TOO_MANY_FILES'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field name.',
          error: 'UNEXPECTED_FIELD'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error.',
          error: 'UPLOAD_ERROR'
        });
    }
  }
  
  if (error.message === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only CSV and Excel files (.csv, .xlsx, .xls) are allowed.',
      error: 'INVALID_FILE_TYPE'
    });
  }
  
  // Pass other errors to the next error handler
  next(error);
};

// Middleware to validate file presence
export const validateFilePresence = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded. Please select a file to import.',
      error: 'NO_FILE'
    });
  }
  next();
};

// Middleware to log file upload details
export const logFileUpload = (req, res, next) => {
  if (req.file) {
    console.log(`File uploaded: ${req.file.originalname} (${req.file.size} bytes, ${req.file.mimetype})`);
  }
  next();
};