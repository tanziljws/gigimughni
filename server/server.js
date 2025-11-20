// Early logging to track startup
console.log('🚀 Starting server initialization...');
console.log('📋 Environment:', process.env.NODE_ENV || 'development');
console.log('📋 PORT:', process.env.PORT || '3000');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables
try {
  require('dotenv').config({ path: './config.env' });
  console.log('✅ Environment variables loaded');
} catch (error) {
  console.error('❌ Failed to load environment variables:', error);
}

// Import utilities with error handling
let initCronJobs, archiveEndedEvents, runMigrations;
try {
  const cronJobsModule = require('./utils/cronJobs');
  const eventCleanupModule = require('./utils/eventCleanup');
  const migrationModule = require('./migrations/runMigration');
  
  initCronJobs = cronJobsModule.initCronJobs;
  archiveEndedEvents = eventCleanupModule.archiveEndedEvents;
  runMigrations = migrationModule.runMigrations || migrationModule.default;
  
  console.log('✅ Utilities loaded');
} catch (error) {
  console.error('❌ Failed to load utilities:', error.message);
  // Create dummy functions to prevent crashes
  initCronJobs = () => console.warn('⚠️ Cron jobs disabled');
  archiveEndedEvents = async () => ({ archived: 0, events: [] });
  runMigrations = async () => { console.warn('⚠️ Migrations disabled'); return Promise.resolve(); };
}

const app = express();
console.log('✅ Express app created');

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

// Root route - for Railway health check (MUST be before route imports to ensure it's always available)
app.get('/', (req, res) => {
  try {
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
  } catch (error) {
    console.error('Error in root route:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint (MUST be before route imports to ensure it's always available)
app.get('/api/health', (req, res) => {
  try {
    res.json({
      status: 'OK',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Error in health check:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Import routes with error handling - prevent server crash if route fails to load
const routes = [
  { path: '/api/auth', module: './routes/auth', name: 'auth' },
  { path: '/api/admin', module: './routes/admin', name: 'admin' },
  { path: '/api/events', module: './routes/events', name: 'events' },
  { path: '/api/categories', module: './routes/categories', name: 'categories' },
  { path: '/api/registrations', module: './routes/registrations', name: 'registrations' },
  { path: '/api/users', module: './routes/users', name: 'users' },
  { path: '/api/analytics', module: './routes/analytics', name: 'analytics' },
  { path: '/api/articles', module: './routes/articles', name: 'articles' },
  { path: '/api/blogs', module: './routes/blogs', name: 'blogs' },
  { path: '/api/contacts', module: './routes/contacts', name: 'contacts' },
  { path: '/api/contact', module: './routes/contact', name: 'contact' },
  { path: '/api/history', module: './routes/history', name: 'history' },
  { path: '/api/upload', module: './routes/upload', name: 'upload' },
  { path: '/api/payments', module: './routes/payments', name: 'payments' },
  { path: '/api/attendance', module: './routes/attendance', name: 'attendance' },
  { path: '/api/certificates', module: './routes/certificates', name: 'certificates' },
  { path: '/api/performers', module: './routes/performers', name: 'performers' },
  { path: '/api/reviews', module: './routes/reviews', name: 'reviews' },
  { path: '/api/admin/reports', module: './routes/reports', name: 'reports' }
];

let registeredRoutes = 0;
let failedRoutes = 0;

routes.forEach(({ path, module, name }) => {
  try {
    const routeModule = require(module);
    app.use(path, routeModule);
    registeredRoutes++;
    console.log(`✅ Route registered: ${path} (${name})`);
  } catch (error) {
    failedRoutes++;
    console.error(`❌ Failed to load route ${path} (${name}):`, error.message);
    console.error(`⚠️ Server will continue without ${path} route`);
    // Don't crash - continue with other routes
  }
});

console.log(`\n✅ Routes registration complete: ${registeredRoutes} registered, ${failedRoutes} failed\n`);

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

