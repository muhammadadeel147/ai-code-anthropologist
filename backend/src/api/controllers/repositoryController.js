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

/**
 * Get dashboard data for repository
 */
exports.getDashboard = async (req, res) => {
  const { id } = req.params;
  const fs = require('fs').promises;
  const path = require('path');

  const repository = await Repository.findById(id);
  
  // Read analysis output
  const analysisPath = path.join(process.cwd(), 'storage', 'repositories', id, 'analysis', 'analysis-output.json');
  const graphPath = path.join(process.cwd(), 'storage', 'repositories', id, 'graph', 'knowledge-graph.json');
  
  let analysisData = null;
  let graphData = null;
  
  try {
    const analysisContent = await fs.readFile(analysisPath, 'utf-8');
    analysisData = JSON.parse(analysisContent);
  } catch (error) {
    logger.warn(`Could not read analysis data for repository ${id}: ${error.message}`);
  }
  
  try {
    const graphContent = await fs.readFile(graphPath, 'utf-8');
    graphData = JSON.parse(graphContent);
  } catch (error) {
    logger.warn(`Could not read graph data for repository ${id}: ${error.message}`);
  }

  // Calculate statistics
  const decisions = analysisData?.decisions || [];
  const graphMetadata = graphData?.graph_metadata || {};
  const nodes = graphData?.nodes || [];
  const edges = graphData?.edges || [];
  const risks = graphData?.risks || [];

  // Count decision statuses
  const activeDecisions = decisions.filter(d => d.status === 'active').length;
  const deprecatedDecisions = decisions.filter(d => d.status === 'deprecated').length;
  const supersededDecisions = decisions.filter(d => d.status === 'superseded').length;

  // Count risk severities
  const criticalRisks = risks.filter(r => r.severity === 'critical').length;
  const highRisks = risks.filter(r => r.severity === 'high').length;
  const mediumRisks = risks.filter(r => r.severity === 'medium').length;
  const lowRisks = risks.filter(r => r.severity === 'low').length;

  // Get recent ADRs (last 5)
  const recentAdrs = decisions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
    .map(adr => ({
      id: adr.id,
      title: adr.title,
      status: adr.status,
      date: adr.date,
      impact_score: nodes.find(n => n.id === adr.id)?.properties?.impact_score || 0,
    }));

  // Get top risks (highest severity first)
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  const topRisks = risks
    .sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0))
    .slice(0, 5)
    .map(risk => ({
      id: risk.id,
      title: risk.title,
      severity: risk.severity,
      type: risk.type,
    }));

  res.json({
    status: 'success',
    data: {
      repository: {
        id: repository.id,
        url: repository.url,
        name: repository.name,
        language: analysisData?.repository_info?.language || 'Unknown',
        total_commits: analysisData?.repository_info?.total_commits || 0,
        date_created: analysisData?.repository_info?.date_created || repository.created_at,
        last_commit: analysisData?.repository_info?.last_commit || repository.updated_at,
        total_files: analysisData?.repository_info?.total_files || 0,
        analysis_completed_at: repository.updated_at,
      },
      stats: {
        total_decisions: decisions.length,
        total_nodes: graphMetadata.total_nodes || nodes.length,
        total_edges: graphMetadata.total_edges || edges.length,
        total_risks: graphMetadata.total_risks || risks.length,
        critical_risks: criticalRisks,
        high_risks: highRisks,
        medium_risks: mediumRisks,
        low_risks: lowRisks,
        active_decisions: activeDecisions,
        deprecated_decisions: deprecatedDecisions,
        superseded_decisions: supersededDecisions,
      },
      recent_adrs: recentAdrs,
      top_risks: topRisks,
    },
  });
};

// Made with Bob
