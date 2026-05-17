const { analysisQueue } = require('../services/queue/analysisQueue');
const Repository = require('../database/models/Repository');
const AnalysisJob = require('../database/models/AnalysisJob');
const repositoryCloner = require('../services/repository/repositoryCloner');
const ibmAIService = require('../services/ai/ibmAIService');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

/**
 * Process analysis job
 */
analysisQueue.process(config.worker.maxConcurrentJobs, async (job) => {
  const { jobId, repositoryId, url, auth } = job.data;

  logger.info(`Starting analysis for job ${jobId}, repository ${repositoryId}`);

  try {
    // Update job status to processing
    await AnalysisJob.updateProgress(jobId, {
      currentStep: 0,
      progressPercentage: 0,
      status: 'processing',
    });

    // Update repository status
    await Repository.update(repositoryId, { status: 'analyzing' });

    // Emit progress via Socket.IO
    const io = global.io;
    if (io) {
      io.to(`job:${jobId}`).emit('progress', {
        step: 0,
        message: 'Starting analysis...',
        percentage: 0,
      });
    }

    // STEP 1: Clone repository
    logger.info(`Step 1: Cloning repository ${url}`);
    await updateProgress(jobId, 1, 10, 'Cloning repository...', io);

    const cloneResult = await repositoryCloner.cloneRepository(url, repositoryId, auth);
    
    logger.info(`Repository cloned: ${cloneResult.totalCommits} commits, ${cloneResult.branches.length} branches`);

    // Get repository files and commits
    const files = await repositoryCloner.getRepositoryFiles(repositoryId);
    const commits = await repositoryCloner.getCommitHistory(repositoryId);
    const stats = await repositoryCloner.getRepositoryStats(repositoryId);

    // Update repository with stats
    await Repository.update(repositoryId, {
      total_commits: stats.totalCommits,
      total_files: stats.totalFiles,
      date_created: commits[commits.length - 1]?.date,
      last_analyzed: new Date(),
    });

    await updateProgress(jobId, 1, 20, 'Repository cloned successfully', io);

    // STEP 2: Execute Prompt 1 - Repository Analysis
    logger.info(`Step 2: Executing Prompt 1 - Repository Analysis`);
    await updateProgress(jobId, 2, 25, 'Analyzing repository structure...', io);

    const analysisOutput = await ibmAIService.executePrompt1({
      url,
      files,
      commits,
      branches: cloneResult.branches,
    });

    // Save analysis output
    const analysisPath = path.join(config.storage.path, 'repositories', repositoryId, 'analysis');
    await fs.mkdir(analysisPath, { recursive: true });
    await fs.writeFile(
      path.join(analysisPath, 'analysis-output.json'),
      JSON.stringify(analysisOutput, null, 2)
    );

    await updateProgress(jobId, 2, 40, `Found ${analysisOutput.decisions?.length || 0} architectural decisions`, io);

    // STEP 3: Execute Prompt 2 - ADR Generation
    logger.info(`Step 3: Executing Prompt 2 - ADR Generation`);
    await updateProgress(jobId, 3, 45, 'Generating Architecture Decision Records...', io);

    const adrOutput = await ibmAIService.executePrompt2(analysisOutput, url);

    // Save ADRs
    const adrPath = path.join(config.storage.path, 'repositories', repositoryId, 'adrs');
    await fs.mkdir(adrPath, { recursive: true });

    for (const adr of adrOutput.adrs || []) {
      await fs.writeFile(
        path.join(adrPath, adr.filename),
        adr.content
      );
    }

    await updateProgress(jobId, 3, 60, `Generated ${adrOutput.adrs?.length || 0} ADRs`, io);

    // STEP 4: Execute Prompt 3 - Knowledge Graph
    logger.info(`Step 4: Executing Prompt 3 - Knowledge Graph Generation`);
    await updateProgress(jobId, 4, 65, 'Building knowledge graph...', io);

    const knowledgeGraph = await ibmAIService.executePrompt3(analysisOutput, adrOutput.adrs || [], url);

    // Save knowledge graph
    const graphPath = path.join(config.storage.path, 'repositories', repositoryId, 'graph');
    await fs.mkdir(graphPath, { recursive: true });
    await fs.writeFile(
      path.join(graphPath, 'knowledge-graph.json'),
      JSON.stringify(knowledgeGraph, null, 2)
    );

    const totalNodes = knowledgeGraph?.graph_metadata?.total_nodes || knowledgeGraph?.nodes?.length || 0;
    await updateProgress(jobId, 4, 80, `Knowledge graph created with ${totalNodes} nodes`, io);

    // STEP 5: Execute Prompt 4 - Q&A Function
    logger.info(`Step 5: Executing Prompt 4 - Q&A Function Generation`);
    await updateProgress(jobId, 5, 85, 'Creating Q&A system...', io);

    const qaOutput = await ibmAIService.executePrompt4(analysisOutput, adrOutput.adrs || [], knowledgeGraph, url);

    // Save Q&A function
    const qaPath = path.join(config.storage.path, 'repositories', repositoryId, 'qa');
    await fs.mkdir(qaPath, { recursive: true });
    await fs.writeFile(
      path.join(qaPath, 'qa-function.json'),
      JSON.stringify(qaOutput, null, 2)
    );

    await updateProgress(jobId, 5, 90, 'Q&A system created', io);

    // STEP 6: Execute Prompt 5 - Testing
    logger.info(`Step 6: Executing Prompt 5 - System Testing`);
    await updateProgress(jobId, 5, 95, 'Running system tests...', io);

    const testOutput = await ibmAIService.executePrompt5(
      {
        analysis: analysisOutput,
        adrs: adrOutput.adrs,
        knowledgeGraph,
        qa: qaOutput,
      },
      url
    );

    // Save test report
    const reportPath = path.join(config.storage.path, 'repositories', repositoryId, 'reports');
    await fs.mkdir(reportPath, { recursive: true });
    await fs.writeFile(
      path.join(reportPath, 'system-readiness-report.json'),
      JSON.stringify(testOutput, null, 2)
    );

    await updateProgress(jobId, 5, 100, 'Analysis complete!', io);

    // Mark job as completed
    await AnalysisJob.markCompleted(jobId);
    await Repository.update(repositoryId, { status: 'completed' });

    // Cleanup cloned repository (optional - keep for now for debugging)
    // await repositoryCloner.cleanup(repositoryId);

    logger.info(`Analysis completed successfully for job ${jobId}`);

    if (io) {
      io.to(`job:${jobId}`).emit('complete', {
        message: 'Analysis completed successfully!',
        results: {
          decisions: analysisOutput.decisions?.length || 0,
          adrs: adrOutput.adrs?.length || 0,
          nodes: knowledgeGraph?.graph_metadata?.total_nodes || knowledgeGraph?.nodes?.length || 0,
          risks: knowledgeGraph?.risk_alerts?.length || knowledgeGraph?.risks?.length || 0,
        },
      });
    }

    return {
      success: true,
      jobId,
      repositoryId,
      results: {
        decisions: analysisOutput.decisions?.length || 0,
        adrs: adrOutput.adrs?.length || 0,
        nodes: knowledgeGraph?.graph_metadata?.total_nodes || knowledgeGraph?.nodes?.length || 0,
      },
    };
  } catch (error) {
    logger.error(`Analysis failed for job ${jobId}:`, error);

    // Mark job as failed
    await AnalysisJob.markFailed(jobId, error.message);
    await Repository.update(repositoryId, { status: 'failed' });

    // Emit error via Socket.IO
    const io = global.io;
    if (io) {
      io.to(`job:${jobId}`).emit('error', {
        message: 'Analysis failed',
        error: error.message,
      });
    }

    throw error;
  }
});

/**
 * Helper function to update progress
 */
async function updateProgress(jobId, step, percentage, message, io) {
  await AnalysisJob.updateProgress(jobId, {
    currentStep: step,
    progressPercentage: percentage,
  });

  if (io) {
    io.to(`job:${jobId}`).emit('progress', {
      step,
      percentage,
      message,
    });
  }

  logger.info(`Job ${jobId} - Step ${step}: ${message} (${percentage}%)`);
}

// Handle worker events
analysisQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed:`, result);
});

analysisQueue.on('failed', (job, error) => {
  logger.error(`Job ${job.id} failed:`, error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing worker...');
  await analysisQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing worker...');
  await analysisQueue.close();
  process.exit(0);
});

logger.info('Analysis worker started and ready to process jobs');

// Make io accessible globally for worker

// Connect worker to backend Socket.IO server as a client and forward emits
const { io: ioClient } = require('socket.io-client');
const wsUrl = process.env.WS_URL || `http://localhost:${config.port}`;
const backendSocket = ioClient(wsUrl, { reconnection: true });

backendSocket.on('connect', () => {
  logger.info(`Worker connected to backend Socket.IO at ${wsUrl} (id: ${backendSocket.id})`);
});

backendSocket.on('connect_error', (err) => {
  logger.error('Worker Socket.IO connection error:', err && err.message);
});

// Provide a minimal global.io compatible API used by the worker
global.io = {
  to: (room) => ({
    emit: (event, payload) => {
      // Forward standard events to backend with jobId extracted from room
      const jobId = typeof room === 'string' ? room.replace(/^job:/, '') : undefined;
      if (!jobId) return;

      if (event === 'progress') {
        backendSocket.emit('worker:progress', { jobId, ...payload });
      } else if (event === 'complete') {
        backendSocket.emit('worker:complete', { jobId, ...payload });
      } else if (event === 'error') {
        backendSocket.emit('worker:error', { jobId, ...payload });
      } else {
        // Generic forward
        backendSocket.emit('worker:event', { jobId, event, payload });
      }
    },
  }),
};

module.exports = analysisQueue;

// Made with Bob
