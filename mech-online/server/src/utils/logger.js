const pino = require('pino');
const pinoHttp = require('pino-http');

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      '*.password',
      'passwordHash',
      '*.passwordHash',
      'token',
      '*.token',
      'accessToken',
      'refreshToken',
      'refreshTokenHash',
      'passwordResetToken',
      'apiKey',
      '*.apiKey',
      'LLM_API_KEY',
      'MONGODB_URI',
    ],
    censor: '[REDACTED]',
  },
});

const httpLogger = pinoHttp({
  logger,
  autoLogging: process.env.NODE_ENV !== 'test', // Suppress noisy logs during automated tests
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      ip: req.ip || (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '',
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

module.exports = { logger, httpLogger };

