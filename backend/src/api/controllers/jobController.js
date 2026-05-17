const AnalysisJob = require('../../database/models/AnalysisJob');
const logger = require('../../utils/logger');

/**
 * Get job by ID
 */
exports.getJobById = async (req, res) => {
  const { id } = req.params;

  const job = await AnalysisJob.findById(id);

  // Calculate estimated time remaining
  let estimatedTimeRemaining = null;
  if (job.status === 'processing' && job.started_at) {
    const elapsedMinutes = (Date.now() - new Date(job.started_at).getTime()) / 1000 / 60;
    const progressRatio = job.progress_percentage / 100;
    const estimatedTotalMinutes = progressRatio > 0 ? elapsedMinutes / progressRatio : 120;
    estimatedTimeRemaining = Math.max(0, Math.round(estimatedTotalMinutes - elapsedMinutes));
  }

  res.json({
    status: 'success',
    data: {
      job,
      estimatedTimeRemaining: estimatedTimeRemaining ? `${estimatedTimeRemaining} minutes` : null,
    },
  });
};

/**
 * Get all jobs with pagination
 */
exports.getAllJobs = async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const status = req.query.status;

  const result = await AnalysisJob.findAll({ limit, offset, status });

  res.json({
    status: 'success',
    data: result,
  });
};

/**
 * Cancel a job
 */
exports.cancelJob = async (req, res) => {
  const { id } = req.params;

  const job = await AnalysisJob.markCancelled(id);

  logger.info(`Job cancelled: ${id}`);

  res.json({
    status: 'success',
    message: 'Job cancelled successfully',
    data: {
      job,
    },
  });
};

/**
 * Get job statistics
 */
exports.getJobStats = async (req, res) => {
  const stats = await AnalysisJob.getStats();
  const activeJobs = await AnalysisJob.getActiveJobs();

  res.json({
    status: 'success',
    data: {
      stats,
      activeJobs: activeJobs.length,
      activeJobsList: activeJobs.map(job => ({
        id: job.id,
        repository: job.repository_name,
        status: job.status,
        progress: job.progress_percentage,
        currentStep: job.current_step,
      })),
    },
  });
};

// Made with Bob
