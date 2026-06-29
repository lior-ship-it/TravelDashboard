require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDatabase, closeDatabase } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const apiRoutes = require('./routes/api.routes');
const adminRoutes = require('./routes/admin.routes');
const { startSyncJob } = require('./jobs/data-sync.job');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Initialize database
initDatabase();

// Routes
app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);

// Serve frontend dashboard (if built) - with no-cache headers
const frontendPath = path.join(__dirname, '../../frontend/dashboard');
app.use(express.static(frontendPath, {
  setHeaders: (res, path) => {
    // Disable caching for JS and HTML files
    if (path.endsWith('.js') || path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Serve dashboard at /:tenant/:token
app.get('/:tenant/:token', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('  Bluespine Dashboard API Server');
  console.log('========================================');
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Port: ${PORT}`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log('========================================\n');

  // Start scheduled sync job
  startSyncJob();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\nSIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    closeDatabase();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    closeDatabase();
    process.exit(0);
  });
});
