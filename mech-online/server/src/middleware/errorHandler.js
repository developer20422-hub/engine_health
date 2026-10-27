const { sendResponse } = require('../utils/format');

/**
 * Central Error Handling Middleware
 * Guarantees uniform API error response shape: { success: false, data: null, error: { ... } }
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.status || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid identifier: ${err.value}`;
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'DATABASE_VALIDATION_ERROR';
    message = 'Database validation failed';
    details = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY_ERROR';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists`;
    details = err.keyValue;
  }

  if (statusCode >= 500) {
    console.error(`[CRITICAL] Server Error on ${req.method} ${req.url}:`, err);
  }

  return sendResponse(res, statusCode, null, {
    message,
    code,
    details,
  });
};

module.exports = { errorHandler };
