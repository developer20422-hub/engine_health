require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');
const { httpLogger } = require('./utils/logger');
const { sendResponse } = require('./utils/format');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;


// Security and utility middleware
app.use(helmet());

// Strict CORS allow-list
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }
    },
    credentials: true,
  })
);

// Strict request size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// NoSQL Injection Sanitization (express-mongo-sanitize)
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize());

app.use(cookieParser());
app.use(httpLogger);

// Global rate limiting
const { generalLimiter } = require('./middleware/rateLimiter');
app.use('/api', generalLimiter);

// Route Handlers
const authRoutes = require('./routes/authRoutes');
const calcRoutes = require('./routes/calcRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const organisationRoutes = require('./routes/organisationRoutes');
const batchRoutes = require('./routes/batchRoutes');

// Base Health Check Route
app.get('/api/health', (req, res) => {
  return sendResponse(res, 200, {
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    service: 'Mech Online Diagnostic Engine',
    version: '1.0.0',
    dbConnected: true,
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api', calcRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/organisations', organisationRoutes);
app.use('/api/batches', batchRoutes);


// 404 Route Handler
app.use((req, res, next) => {
  const err = new Error(`Cannot ${req.method} ${req.originalUrl}`);
  err.status = 404;
  err.code = 'ROUTE_NOT_FOUND';
  next(err);
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start Server and connect to Database
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`Mech Online Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });
    return server;
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { app, startServer };
