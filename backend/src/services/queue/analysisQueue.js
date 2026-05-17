const Queue = require('bull');
const config = require('../../config');
const logger = require('../../utils/logger');

// Create Bull queue for analysis jobs
const analysisQueue = new Queue('repository-analysis', config.redis.url, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1 minute
    },
    timeout: config.worker.jobTimeoutMs,
    removeOnComplete: false,
    removeOnFail: false,
  },
  settings: {
    maxStalledCount: 1,
    stalledInterval: 30000, // 30 seconds
  },
});

// Queue event handlers
analysisQueue.on('error', (error) => {
  logger.error('Queue error:', error);
});

analysisQueue.on('waiting', (jobId) => {
  logger.info(`Job ${jobId} is waiting`);
});

analysisQueue.on('active', (job) => {
  logger.info(`Job ${job.id} has started processing`);
});

analysisQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} has stalled`);
});

analysisQueue.on('progress', (job, progress) => {
  logger.debug(`Job ${job.id} progress: ${progress}%`);
});

analysisQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed successfully`);
});

analysisQueue.on('failed', (job, error) => {
  logger.error(`Job ${job.id} failed:`, error);
});

analysisQueue.on('removed', (job) => {
  logger.info(`Job ${job.id} removed from queue`);
});

/**
 * Add a new analysis job to the queue
 */
const addAnalysisJob = async (data) => {
  try {
    const job = await analysisQueue.add(data, {
      jobId: data.jobId,
      priority: 1,
    });
    
    logger.info(`Analysis job added to queue: ${job.id}`);
    return job;
  } catch (error) {
    logger.error('Failed to add job to queue:', error);
    throw error;
  }
};

/**
 * Get job by ID
 */
const getJob = async (jobId) => {
  try {
    const job = await analysisQueue.getJob(jobId);
    return job;
  } catch (error) {
    logger.error(`Failed to get job ${jobId}:`, error);
    throw error;
  }
};

/**
 * Cancel a job
 */
const cancelJob = async (jobId) => {
  try {
    const job = await analysisQueue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info(`Job ${jobId} cancelled and removed from queue`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Failed to cancel job ${jobId}:`, error);
    throw error;
  }
};

/**
 * Get queue statistics
 */
const getQueueStats = async () => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      analysisQueue.getWaitingCount(),
      analysisQueue.getActiveCount(),
      analysisQueue.getCompletedCount(),
      analysisQueue.getFailedCount(),
      analysisQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    throw error;
  }
};

/**
 * Clean old jobs from queue
 */
const cleanQueue = async (grace = 86400000) => {
  try {
    // Clean completed jobs older than grace period (default 24 hours)
    await analysisQueue.clean(grace, 'completed');
    // Clean failed jobs older than grace period
    await analysisQueue.clean(grace, 'failed');
    
    logger.info('Queue cleaned successfully');
  } catch (error) {
    logger.error('Failed to clean queue:', error);
    throw error;
  }
};

/**
 * Pause the queue
 */
const pauseQueue = async () => {
  try {
    await analysisQueue.pause();
    logger.info('Queue paused');
  } catch (error) {
    logger.error('Failed to pause queue:', error);
    throw error;
  }
};

/**
 * Resume the queue
 */
const resumeQueue = async () => {
  try {
    await analysisQueue.resume();
    logger.info('Queue resumed');
  } catch (error) {
    logger.error('Failed to resume queue:', error);
    throw error;
  }
};

/**
 * Close the queue connection
 */
const closeQueue = async () => {
  try {
    await analysisQueue.close();
    logger.info('Queue connection closed');
  } catch (error) {
    logger.error('Failed to close queue:', error);
    throw error;
  }
};

module.exports = {
  analysisQueue,
  addAnalysisJob,
  getJob,
  cancelJob,
  getQueueStats,
  cleanQueue,
  pauseQueue,
  resumeQueue,
  closeQueue,
};

// Made with Bob
