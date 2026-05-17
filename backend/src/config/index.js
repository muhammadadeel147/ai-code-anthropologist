require('dotenv').config();

const config = {
  // Server configuration
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://anthropologist:dev_password_change_in_prod@localhost:5432/ai_anthropologist',
    pool: {
      min: 2,
      max: 10,
    },
  },

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // API Keys
  claudeApiKey: process.env.CLAUDE_API_KEY,
  githubToken: process.env.GITHUB_TOKEN,

  // Worker configuration
  worker: {
    maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS) || 2,
    jobTimeoutMs: parseInt(process.env.JOB_TIMEOUT_MS) || 7200000, // 2 hours
  },

  // Storage configuration
  storage: {
    path: process.env.STORAGE_PATH || './storage',
    maxRepoSizeMB: parseInt(process.env.MAX_REPO_SIZE_MB) || 500,
  },

  // Security
  jwt: {
    secret: process.env.JWT_SECRET || 'change_this_in_production',
    expiresIn: '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Claude API configuration
  claude: {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 8000,
    temperature: 0.7,
  },

  // Analysis configuration
  analysis: {
    maxFilesPerBatch: 200,
    maxCommitsToAnalyze: 1000,
    promptTimeout: 300000, // 5 minutes per prompt
  },
};

// Validate required configuration
const requiredEnvVars = ['CLAUDE_API_KEY'];

if (config.nodeEnv === 'production') {
  requiredEnvVars.push('DATABASE_URL', 'REDIS_URL', 'JWT_SECRET');
}

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
  if (config.nodeEnv === 'production') {
    process.exit(1);
  }
}

module.exports = config;

// Made with Bob
