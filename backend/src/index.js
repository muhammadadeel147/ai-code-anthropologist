const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');

const config = require('./config');
const logger = require('./utils/logger');
const { errorHandler, handleUnhandledRejection, handleUncaughtException } = require('./utils/errors');
const db = require('./database/db');

// Import routes
const repositoryRoutes = require('./api/routes/repositoryRoutes');
const jobRoutes = require('./api/routes/jobRoutes');
const adrRoutes = require('./api/routes/adrRoutes');
const graphRoutes = require('./api/routes/graphRoutes');
const qaRoutes = require('./api/routes/qaRoutes');

// Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

// Create Express app
const app = express();
const server = http.createServer(app);

// Setup Socket.IO for real-time updates
const io = new Server(server, {
  cors: {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  },
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(helmet()); // Security headers
app.use(cors(config.cors)); // CORS
app.use(compression()); // Compress responses
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies
app.use(morgan('combined', { stream: logger.stream })); // HTTP request logging

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

// API routes
app.use('/api/repositories', repositoryRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/adrs', adrRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/qa', qaRoutes);

// API documentation endpoint
app.get('/api-docs', (req, res) => {
  res.json({
    name: 'AI Code Anthropologist API',
    version: '1.0.0',
    description: 'API for analyzing GitHub repositories and generating architectural documentation',
    endpoints: {
      repositories: {
        'POST /api/repositories': 'Submit repository for analysis',
        'GET /api/repositories': 'List all analyzed repositories',
        'GET /api/repositories/:id': 'Get repository details',
        'DELETE /api/repositories/:id': 'Delete repository analysis',
      },
      jobs: {
        'GET /api/jobs/:id': 'Get job status',
        'POST /api/jobs/:id/cancel': 'Cancel running job',
        'WS /api/jobs/:id/stream': 'Real-time progress updates',
      },
      adrs: {
        'GET /api/repositories/:repoId/adrs': 'List all ADRs',
        'GET /api/repositories/:repoId/adrs/:adrId': 'Get ADR details',
        'POST /api/repositories/:repoId/adrs/:adrId/export': 'Export ADR',
      },
      graph: {
        'GET /api/repositories/:repoId/graph': 'Get knowledge graph data',
        'GET /api/repositories/:repoId/graph/risks': 'Get risk analysis',
      },
      qa: {
        'POST /api/repositories/:repoId/qa': 'Ask a question',
        'GET /api/repositories/:repoId/qa/history': 'Get Q&A history',
      },
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('subscribe:job', (jobId) => {
    socket.join(`job:${jobId}`);
    logger.info(`Client ${socket.id} subscribed to job ${jobId}`);
  });

  socket.on('unsubscribe:job', (jobId) => {
    socket.leave(`job:${jobId}`);
    logger.info(`Client ${socket.id} unsubscribed from job ${jobId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });

  // Receive forwarded events from worker processes and broadcast to job rooms
  socket.on('worker:progress', (data) => {
    try {
      const { jobId, step, percentage, message } = data || {};
      if (jobId) {
        io.to(`job:${jobId}`).emit('progress', { step, percentage, message });
        logger.info(`Forwarded worker progress for job ${jobId}: ${percentage}%`);
      }
    } catch (err) {
      logger.error('Error forwarding worker:progress', err);
    }
  });

  socket.on('worker:complete', (data) => {
    try {
      const { jobId, results, message } = data || {};
      if (jobId) {
        io.to(`job:${jobId}`).emit('complete', { message, results });
        logger.info(`Forwarded worker complete for job ${jobId}`);
      }
    } catch (err) {
      logger.error('Error forwarding worker:complete', err);
    }
  });

  socket.on('worker:error', (data) => {
    try {
      const { jobId, error, message } = data || {};
      if (jobId) {
        io.to(`job:${jobId}`).emit('error', { error, message });
        logger.info(`Forwarded worker error for job ${jobId}`);
      }
    } catch (err) {
      logger.error('Error forwarding worker:error', err);
    }
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Start listening
    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
      logger.info(`API documentation available at http://localhost:${config.port}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      await db.close();
      logger.info('Database connections closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();

module.exports = { app, io };

// Made with Bob
