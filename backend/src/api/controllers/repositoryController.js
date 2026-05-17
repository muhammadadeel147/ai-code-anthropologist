const Joi = require('joi');
const Repository = require('../../database/models/Repository');
const AnalysisJob = require('../../database/models/AnalysisJob');
const { ValidationError, ConflictError } = require('../../utils/errors');
const logger = require('../../utils/logger');
const analysisQueue = require('../../services/queue/analysisQueue');

/**
 * Validation schema for repository creation
 */
const createRepositorySchema = Joi.object({
  url: Joi.string()
    .uri()
    .pattern(/^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/)
    .required()
    .messages({
      'string.pattern.base': 'URL must be a valid GitHub repository URL (e.g., https://github.com/user/repo)',
    }),
  auth: Joi.object({
    token: Joi.string().optional(),
  }).optional(),
});

/**
 * Parse GitHub URL to extract owner and repo name
 */
const parseGitHubUrl = (url) => {
  const match = url.match(/github\.com\/([\w-]+)\/([\w.-]+)/);
  if (!match) {
    throw new ValidationError('Invalid GitHub URL format');
  }
  return {
    owner: match[1],
    name: match[2].replace(/\.git$/, ''),
  };
};

/**
 * Create a new repository and start analysis
 */
exports.createRepository = async (req, res) => {
  // Validate request body
  const { error, value } = createRepositorySchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { url, auth } = value;

  // Parse GitHub URL
  const { owner, name } = parseGitHubUrl(url);

  // Check if repository already exists
  const existingRepo = await Repository.findByUrl(url);
  if (existingRepo) {
    // If analysis is in progress or completed, return existing
    if (existingRepo.status === 'analyzing' || existingRepo.status === 'completed') {
      const jobs = await AnalysisJob.findByRepositoryId(existingRepo.id);
      const latestJob = jobs[0];
      
      return res.status(200).json({
        status: 'success',
        message: 'Repository already exists',
        data: {
          repository: existingRepo,
          jobId: latestJob?.id,
          analysisStatus: latestJob?.status,
        },
      });
    }
    
    // If failed, allow re-analysis
    if (existingRepo.status === 'failed') {
      logger.info(`Re-analyzing failed repository: ${url}`);
    } else {
      throw new ConflictError('Repository analysis already in progress');
    }
  }

  // Create or update repository record
  let repository;
  if (existingRepo) {
    repository = await Repository.update(existingRepo.id, { status: 'pending' });
  } else {
    repository = await Repository.create({ url, name, owner });
  }

  // Create analysis job
  const job = await AnalysisJob.create(repository.id);

  // Add job to queue
  await analysisQueue.addAnalysisJob({
    jobId: job.id,
    repositoryId: repository.id,
    url,
    auth: auth?.token,
  });

  logger.info(`Repository analysis queued: ${url} (Job ID: ${job.id})`);

  res.status(201).json({
    status: 'success',
    message: 'Repository submitted for analysis',
    data: {
      repository,
      jobId: job.id,
      estimatedTime: '1-2 hours',
    },
  });
};

/**
 * Get all repositories with pagination
 */
exports.getAllRepositories = async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const status = req.query.status;

  const result = await Repository.findAll({ limit, offset, status });

  res.json({
    status: 'success',
    data: result,
  });
};

/**
 * Get repository by ID
 */
exports.getRepositoryById = async (req, res) => {
  const { id } = req.params;

  const repository = await Repository.findById(id);
  const jobs = await AnalysisJob.findByRepositoryId(id);
  const stats = await Repository.getStats(id);

  res.json({
    status: 'success',
    data: {
      repository,
      jobs,
      stats,
    },
  });
};

/**
 * Delete repository and all related data
 */
exports.deleteRepository = async (req, res) => {
  const { id } = req.params;

  const repository = await Repository.delete(id);

  logger.info(`Repository deleted: ${repository.url} (ID: ${id})`);

  res.json({
    status: 'success',
    message: 'Repository and all related data deleted successfully',
    data: {
      repository,
    },
  });
};

/**
 * Get repository statistics
 */
exports.getRepositoryStats = async (req, res) => {
  const { id } = req.params;

  const repository = await Repository.findById(id);
  const stats = await Repository.getStats(id);

  res.json({
    status: 'success',
    data: {
      repository: {
        id: repository.id,
        name: repository.name,
        url: repository.url,
        status: repository.status,
      },
      stats,
    },
  });
};

// Made with Bob
