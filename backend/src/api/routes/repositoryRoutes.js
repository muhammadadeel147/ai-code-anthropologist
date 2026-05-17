const express = require('express');
const router = express.Router();
const repositoryController = require('../controllers/repositoryController');
const { asyncHandler } = require('../../utils/errors');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config');

/**
 * @route   POST /api/repositories
 * @desc    Submit a repository for analysis
 * @access  Public
 */
router.post('/', asyncHandler(repositoryController.createRepository));

/**
 * @route   GET /api/repositories
 * @desc    Get all repositories with pagination
 * @access  Public
 */
router.get('/', asyncHandler(repositoryController.getAllRepositories));

/**
 * @route   GET /api/repositories/:id
 * @desc    Get repository details by ID
 * @access  Public
 */
router.get('/:id', asyncHandler(repositoryController.getRepositoryById));

/**
 * @route   DELETE /api/repositories/:id
 * @desc    Delete a repository and all its data
 * @access  Public
 */
router.delete('/:id', asyncHandler(repositoryController.deleteRepository));

/**
 * @route   GET /api/repositories/:id/stats
 * @desc    Get repository statistics
 * @access  Public
 */
router.get('/:id/stats', asyncHandler(repositoryController.getRepositoryStats));

/**
 * @route   GET /api/repositories/:id/dashboard
 * @desc    Get dashboard data for repository
 * @access  Public
 */
router.get('/:id/dashboard', asyncHandler(repositoryController.getDashboard));

/**
 * @route   GET /api/repositories/:repoId/adrs
 * @desc    Get all ADRs for a repository
 * @access  Public
 */
router.get('/:repoId/adrs', asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const analysisPath = path.join(config.storage.path, 'repositories', repoId, 'analysis', 'analysis-output.json');
  
  try {
    const content = await fs.readFile(analysisPath, 'utf-8');
    const data = JSON.parse(content);
    res.json(data.decisions || []);
  } catch (error) {
    res.status(404).json({ status: 'fail', message: 'ADRs not found' });
  }
}));

/**
 * @route   GET /api/repositories/:repoId/adrs/:adrId
 * @desc    Get specific ADR details
 * @access  Public
 */
router.get('/:repoId/adrs/:adrId', asyncHandler(async (req, res) => {
  const { repoId, adrId } = req.params;
  const analysisPath = path.join(config.storage.path, 'repositories', repoId, 'analysis', 'analysis-output.json');
  
  try {
    const content = await fs.readFile(analysisPath, 'utf-8');
    const data = JSON.parse(content);
    const adr = data.decisions?.find(d => d.id === adrId);
    
    if (!adr) {
      return res.status(404).json({ status: 'fail', message: 'ADR not found' });
    }
    
    res.json(adr);
  } catch (error) {
    res.status(404).json({ status: 'fail', message: 'ADR not found' });
  }
}));

/**
 * @route   GET /api/repositories/:repoId/graph
 * @desc    Get knowledge graph for a repository
 * @access  Public
 */
router.get('/:repoId/graph', asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const graphPath = path.join(config.storage.path, 'repositories', repoId, 'graph', 'knowledge-graph.json');
  
  try {
    const content = await fs.readFile(graphPath, 'utf-8');
    const data = JSON.parse(content);
    res.json(data);
  } catch (error) {
    res.status(404).json({ status: 'fail', message: 'Knowledge graph not found' });
  }
}));

/**
 * @route   GET /api/repositories/:repoId/qa/history
 * @desc    Get Q&A history for a repository
 * @access  Public
 */
router.get('/:repoId/qa/history', asyncHandler(async (req, res) => {
  // For now, return empty array - can be implemented with database storage later
  res.json([]);
}));

/**
 * @route   GET /api/repositories/:repoId/qa/suggestions
 * @desc    Get suggested questions for a repository
 * @access  Public
 */
router.get('/:repoId/qa/suggestions', asyncHandler(async (req, res) => {
  // Return some default suggestions
  res.json([
    "What are the main architectural decisions in this codebase?",
    "What are the critical risks identified?",
    "How is the authentication implemented?",
    "What database is being used?",
    "What are the deprecated decisions?"
  ]);
}));

/**
 * @route   POST /api/repositories/:repoId/qa/ask
 * @desc    Ask a question about the repository
 * @access  Public
 */
router.post('/:repoId/qa/ask', asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const { question } = req.body;
  
  // For now, return a placeholder response
  // This should be implemented with IBM AI service
  res.json({
    question,
    answer: "This is a placeholder answer. Q&A functionality will be implemented with IBM AI integration.",
    sources: [],
    confidence: 0.5
  });
}));

module.exports = router;

// Made with Bob
