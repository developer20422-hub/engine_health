const multer = require('multer');
const path = require('path');

// Store file in memory buffer for immediate streaming and validation
const storage = multer.memoryStorage();

// File filter: accept only CSV files
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = [
    'text/csv',
    'application/vnd.ms-excel',
    'text/plain',
    'application/csv',
    'text/x-csv',
  ];

  if (ext === '.csv' || allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only CSV (.csv) files are supported.');
    error.status = 400;
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Limit to 10MB and max 1 file per request
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
    files: 1,
  },
});

module.exports = { upload };
