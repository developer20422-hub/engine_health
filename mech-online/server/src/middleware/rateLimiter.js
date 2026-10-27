const rateLimit = require('express-rate-limit');
const { sendResponse } = require('../utils/format');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendResponse(res, 429, null, {
      message: 'Too many requests from this IP, please try again after 15 minutes',
      code: 'TOO_MANY_REQUESTS',
    });
  },
  skip: () => process.env.NODE_ENV === 'test', // Skip in automated tests
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendResponse(res, 429, null, {
      message: 'Too many authentication attempts, please try again after 15 minutes',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    });
  },
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = {
  generalLimiter,
  authLimiter,
};
