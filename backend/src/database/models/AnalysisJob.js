const db = require('../db');
const { NotFoundError } = require('../../utils/errors');

class AnalysisJob {
  /**
   * Create a new analysis job
   */
  static async create(repositoryId) {
    const query = `
      INSERT INTO analysis_jobs (repository_id, status, current_step, total_steps, progress_percentage)
      VALUES ($1, 'queued', 0, 5, 0)
      RETURNING *
    `;
    const result = await db.query(query, [repositoryId]);
    return result.rows[0];
  }

  /**
   * Find job by ID
   */
  static async findById(id) {
    const query = `
      SELECT aj.*, r.url as repository_url, r.name as repository_name
      FROM analysis_jobs aj
      JOIN repositories r ON aj.repository_id = r.id
      WHERE aj.id = $1
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Analysis job');
    }
    return result.rows[0];
  }

  /**
   * Find jobs by repository ID
   */
  static async findByRepositoryId(repositoryId) {
    const query = `
      SELECT * FROM analysis_jobs 
      WHERE repository_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [repositoryId]);
    return result.rows;
  }

  /**
   * Get all jobs with pagination
   */
  static async findAll({ limit = 50, offset = 0, status = null }) {
    let query = `
      SELECT aj.*, r.url as repository_url, r.name as repository_name
      FROM analysis_jobs aj
      JOIN repositories r ON aj.repository_id = r.id
    `;
    const values = [];
    
    if (status) {
      query += ' WHERE aj.status = $1';
      values.push(status);
    }
    
    query += ' ORDER BY aj.created_at DESC LIMIT $' + (values.length + 1) + ' OFFSET $' + (values.length + 2);
    values.push(limit, offset);
    
    const result = await db.query(query, values);
    
    // Get total count
    const countQuery = status 
      ? 'SELECT COUNT(*) FROM analysis_jobs WHERE status = $1'
      : 'SELECT COUNT(*) FROM analysis_jobs';
    const countValues = status ? [status] : [];
    const countResult = await db.query(countQuery, countValues);
    
    return {
      jobs: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    };
  }

  /**
   * Update job progress
   */
  static async updateProgress(id, { currentStep, progressPercentage, status = null }) {
    const updates = ['current_step = $1', 'progress_percentage = $2'];
    const values = [currentStep, progressPercentage];
    let paramCount = 3;

    if (status) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    // Set started_at if moving to processing
    if (status === 'processing') {
      updates.push('started_at = NOW()');
    }

    values.push(id);
    const query = `
      UPDATE analysis_jobs 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      throw new NotFoundError('Analysis job');
    }
    return result.rows[0];
  }

  /**
   * Mark job as completed
   */
  static async markCompleted(id) {
    const query = `
      UPDATE analysis_jobs 
      SET status = 'completed', 
          progress_percentage = 100,
          current_step = 5,
          completed_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Analysis job');
    }
    return result.rows[0];
  }

  /**
   * Mark job as failed
   */
  static async markFailed(id, errorMessage) {
    const query = `
      UPDATE analysis_jobs 
      SET status = 'failed', 
          error_message = $1,
          completed_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [errorMessage, id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Analysis job');
    }
    return result.rows[0];
  }

  /**
   * Mark job as cancelled
   */
  static async markCancelled(id) {
    const query = `
      UPDATE analysis_jobs 
      SET status = 'cancelled',
          completed_at = NOW()
      WHERE id = $1 AND status IN ('queued', 'processing')
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Analysis job or job cannot be cancelled');
    }
    return result.rows[0];
  }

  /**
   * Get job statistics
   */
  static async getStats() {
    const query = `
      SELECT 
        status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
      FROM analysis_jobs
      WHERE completed_at IS NOT NULL
      GROUP BY status
    `;
    const result = await db.query(query);
    
    const stats = {
      total: 0,
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      avg_duration_minutes: 0,
    };

    result.rows.forEach(row => {
      stats[row.status] = parseInt(row.count);
      stats.total += parseInt(row.count);
      if (row.status === 'completed' && row.avg_duration_seconds) {
        stats.avg_duration_minutes = Math.round(row.avg_duration_seconds / 60);
      }
    });

    return stats;
  }

  /**
   * Get active jobs (queued or processing)
   */
  static async getActiveJobs() {
    const query = `
      SELECT aj.*, r.url as repository_url, r.name as repository_name
      FROM analysis_jobs aj
      JOIN repositories r ON aj.repository_id = r.id
      WHERE aj.status IN ('queued', 'processing')
      ORDER BY aj.created_at ASC
    `;
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Delete old completed jobs (cleanup)
   */
  static async deleteOldJobs(daysOld = 30) {
    const query = `
      DELETE FROM analysis_jobs 
      WHERE status IN ('completed', 'failed', 'cancelled')
      AND completed_at < NOW() - INTERVAL '${daysOld} days'
      RETURNING id
    `;
    const result = await db.query(query);
    return result.rows.length;
  }
}

module.exports = AnalysisJob;

// Made with Bob
