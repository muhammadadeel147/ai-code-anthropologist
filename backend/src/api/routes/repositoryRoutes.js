const express = require('express');
const router = express.Router();
const repositoryController = require('../controllers/repositoryController');
const { asyncHandler } = require('../../utils/errors');

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

module.exports = router;

// Made with Bob
