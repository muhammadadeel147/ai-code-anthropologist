const db = require('../db');
const { NotFoundError } = require('../../utils/errors');

class Repository {
  /**
   * Create a new repository record
   */
  static async create({ url, name, owner, language = null }) {
    const query = `
      INSERT INTO repositories (url, name, owner, language, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `;
    const values = [url, name, owner, language];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find repository by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM repositories WHERE id = $1';
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Repository');
    }
    return result.rows[0];
  }

  /**
   * Find repository by URL
   */
  static async findByUrl(url) {
    const query = 'SELECT * FROM repositories WHERE url = $1';
    const result = await db.query(query, [url]);
    return result.rows[0] || null;
  }

  /**
   * Get all repositories with pagination
   */
  static async findAll({ limit = 50, offset = 0, status = null }) {
    let query = 'SELECT * FROM repositories';
    const values = [];
    
    if (status) {
      query += ' WHERE status = $1';
      values.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (values.length + 1) + ' OFFSET $' + (values.length + 2);
    values.push(limit, offset);
    
    const result = await db.query(query, values);
    
    // Get total count
    const countQuery = status 
      ? 'SELECT COUNT(*) FROM repositories WHERE status = $1'
      : 'SELECT COUNT(*) FROM repositories';
    const countValues = status ? [status] : [];
    const countResult = await db.query(countQuery, countValues);
    
    return {
      repositories: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    };
  }

  /**
   * Update repository
   */
  static async update(id, data) {
    const allowedFields = [
      'name', 'owner', 'language', 'total_commits', 
      'total_files', 'date_created', 'last_analyzed', 'status'
    ];
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(data).forEach(key => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramCount}`);
        values.push(data[key]);
        paramCount++;
      }
    });
    
    if (updates.length === 0) {
      return await this.findById(id);
    }
    
    values.push(id);
    const query = `
      UPDATE repositories 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      throw new NotFoundError('Repository');
    }
    return result.rows[0];
  }

  /**
   * Delete repository and all related data
   */
  static async delete(id) {
    const query = 'DELETE FROM repositories WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Repository');
    }
    return result.rows[0];
  }

  /**
   * Get repository statistics
   */
  static async getStats(id) {
    const queries = {
      adrs: 'SELECT COUNT(*) as count FROM adrs WHERE repository_id = $1',
      nodes: 'SELECT COUNT(*) as count FROM graph_nodes WHERE repository_id = $1',
      edges: 'SELECT COUNT(*) as count FROM graph_edges WHERE repository_id = $1',
      risks: 'SELECT COUNT(*) as count FROM risks WHERE repository_id = $1',
      criticalRisks: 'SELECT COUNT(*) as count FROM risks WHERE repository_id = $1 AND severity = $2',
      qaQuestions: 'SELECT COUNT(*) as count FROM qa_history WHERE repository_id = $1',
    };

    const [adrs, nodes, edges, risks, criticalRisks, qaQuestions] = await Promise.all([
      db.query(queries.adrs, [id]),
      db.query(queries.nodes, [id]),
      db.query(queries.edges, [id]),
      db.query(queries.risks, [id]),
      db.query(queries.criticalRisks, [id, 'critical']),
      db.query(queries.qaQuestions, [id]),
    ]);

    return {
      total_adrs: parseInt(adrs.rows[0].count),
      total_nodes: parseInt(nodes.rows[0].count),
      total_edges: parseInt(edges.rows[0].count),
      total_risks: parseInt(risks.rows[0].count),
      critical_risks: parseInt(criticalRisks.rows[0].count),
      total_qa_questions: parseInt(qaQuestions.rows[0].count),
    };
  }

  /**
   * Check if repository exists
   */
  static async exists(url) {
    const query = 'SELECT EXISTS(SELECT 1 FROM repositories WHERE url = $1)';
    const result = await db.query(query, [url]);
    return result.rows[0].exists;
  }
}

module.exports = Repository;

// Made with Bob
