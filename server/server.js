const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: './config.env' });
const { initCronJobs } = require('./utils/cronJobs');
const { archiveEndedEvents } = require('./utils/eventCleanup');
const { runMigrations } = require('./migrations/runMigration');

const app = express();

// ⚠️ CRITICAL: Handle OPTIONS requests FIRST - before ANY other middleware
// This prevents redirect issues with preflight requests
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "https://fronten.up.railway.app");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cache-Control, Pragma, Expires, X-Requested-With, Accept, Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Max-Age", "86400");
  
  // Handle preflight OPTIONS request - return immediately, NO redirect
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// CORS configuration - MUST be before helmet to work properly
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  process.env.FRONTEND_URL,
  'https://fronten.up.railway.app' // Production frontend URL
].filter(Boolean); // Remove undefined values

// CORS middleware for all other requests - STRICT origin (no wildcard in production)
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cache-Control', 
    'Pragma', 
    'Expires',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Content-Length', 'Content-Type', 'Content-Disposition'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Security middleware - AFTER CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting - more generous for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically with CORS headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Root route - for Railway health check
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Event Yukk API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/api/health',
      api: '/api'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const eventRoutes = require('./routes/events');
const categoryRoutes = require('./routes/categories');
const registrationRoutes = require('./routes/registrations');
const userRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');
const articlesRoutes = require('./routes/articles');
const blogsRoutes = require('./routes/blogs');
const contactsRoutes = require('./routes/contacts');
const contactRoutes = require('./routes/contact');
const historyRoutes = require('./routes/history');
const uploadRoutes = require('./routes/upload');
const paymentRoutes = require('./routes/payments');
const attendanceRoutes = require('./routes/attendance');
const certificateRoutes = require('./routes/certificates');
const performersRoutes = require('./routes/performers');
const reviewsRoutes = require('./routes/reviews');
const reportsRoutes = require('./routes/reports');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/blogs', blogsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/performers', performersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/admin/reports', reportsRoutes);

console.log('✅ Reports routes registered at /api/admin/reports');

// 404 handler - BUT skip for OPTIONS requests (already handled above)
app.use('*', (req, res) => {
  // Don't handle OPTIONS here - already handled by explicit handler above
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

// ⚠️ CRITICAL: Global error handlers - MUST be before app.listen
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  // Don't exit immediately - let Railway handle it
  // process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION!');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  // Don't exit immediately - let Railway handle it
  // process.exit(1);
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('⚠️ SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

const PORT = process.env.PORT || 3000;

// Wrap server startup in try-catch to prevent crashes
let server;
try {
  server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    console.log('✅ All routes registered successfully\n');
    
    // Run database migrations first - wrapped in try-catch
    console.log('🔄 Running database migrations...');
    try {
      await runMigrations();
      console.log('✅ Migrations completed');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      console.error('⚠️ Continuing server startup despite migration error...');
    }
    
    // Run initial cleanup on server start - wrapped in try-catch
    console.log('🧹 Running initial event archival...');
    try {
      const result = await archiveEndedEvents();
      console.log(`✅ Initial archival complete: ${result.archived} events archived`);
    } catch (error) {
      console.error('❌ Initial archival failed:', error);
      console.error('⚠️ Continuing server startup despite archival error...');
    }
    
    // Initialize cron jobs for automatic archival - wrapped in try-catch
    try {
      initCronJobs();
      console.log('✅ Cron jobs initialized');
    } catch (error) {
      console.error('❌ Cron jobs initialization failed:', error);
      console.error('⚠️ Continuing server startup despite cron error...');
    }
    
    console.log('\n✅ Server fully initialized and ready to accept requests!\n');
  });
  
  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
    } else {
      console.error('❌ Server error:', error);
    }
    process.exit(1);
  });
  
} catch (error) {
  console.error('💥 FATAL ERROR during server startup:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}

module.exports = app;

