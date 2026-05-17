/**
 * Custom error classes for the application
 */

class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

class ExternalServiceError extends AppError {
  constructor(service, message = 'External service error') {
    super(`${service}: ${message}`, 502);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

class RepositoryCloneError extends AppError {
  constructor(url, message = 'Failed to clone repository') {
    super(`${message}: ${url}`, 500);
    this.name = 'RepositoryCloneError';
    this.url = url;
  }
}

class AnalysisError extends AppError {
  constructor(step, message = 'Analysis failed') {
    super(`${message} at step: ${step}`, 500);
    this.name = 'AnalysisError';
    this.step = step;
  }
}

class IBMAPIError extends ExternalServiceError {
  constructor(message = 'IBM AI request failed') {
    super('IBM AI', message);
    this.name = 'IBMAPIError';
  }
}

class GitHubAPIError extends ExternalServiceError {
  constructor(message = 'GitHub API request failed') {
    super('GitHub API', message);
    this.name = 'GitHubAPIError';
  }
}

/**
 * Error handler middleware for Express
 */
const errorHandler = (err, req, res, next) => {
  const logger = require('./logger');

  // Log error
  if (err.isOperational) {
    logger.warn({
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.error({
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // Send error response
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  res.status(statusCode).json({
    status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err,
    }),
  });
};

/**
 * Async error wrapper for route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    const logger = require('./logger');
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // In production, you might want to exit the process
    // process.exit(1);
  });
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    const logger = require('./logger');
    logger.error('Uncaught Exception:', error);
    // Exit the process as the application is in an undefined state
    process.exit(1);
  });
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  RepositoryCloneError,
  AnalysisError,
  IBMAPIError,
  GitHubAPIError,
  errorHandler,
  asyncHandler,
  handleUnhandledRejection,
  handleUncaughtException,
};

// Made with Bob
