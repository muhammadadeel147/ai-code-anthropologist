const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { asyncHandler } = require('../../utils/errors');

/**
 * @route   GET /api/jobs/:id
 * @desc    Get job status and details
 * @access  Public
 */
router.get('/:id', asyncHandler(jobController.getJobById));

/**
 * @route   POST /api/jobs/:id/cancel
 * @desc    Cancel a running job
 * @access  Public
 */
router.post('/:id/cancel', asyncHandler(jobController.cancelJob));

/**
 * @route   GET /api/jobs
 * @desc    Get all jobs with pagination
 * @access  Public
 */
router.get('/', asyncHandler(jobController.getAllJobs));

/**
 * @route   GET /api/jobs/stats
 * @desc    Get job statistics
 * @access  Public
 */
router.get('/stats/summary', asyncHandler(jobController.getJobStats));

module.exports = router;

// Made with Bob
