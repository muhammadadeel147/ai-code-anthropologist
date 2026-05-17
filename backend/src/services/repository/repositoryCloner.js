const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config');
const logger = require('../../utils/logger');
const { RepositoryCloneError } = require('../../utils/errors');

class RepositoryCloner {
  constructor() {
    this.storagePath = config.storage.path;
  }

  /**
   * Get the clone directory path for a repository
   */
  getClonePath(repositoryId) {
    return path.join(this.storagePath, 'repositories', repositoryId, 'clone');
  }

  /**
   * Clone a GitHub repository
   */
  async cloneRepository(url, repositoryId, authToken = null) {
    const clonePath = this.getClonePath(repositoryId);

    try {
      // Ensure parent directory exists
      await fs.mkdir(path.dirname(clonePath), { recursive: true });

      // Check if directory already exists
      try {
        await fs.access(clonePath);
        logger.info(`Repository already cloned at ${clonePath}, removing...`);
        await fs.rm(clonePath, { recursive: true, force: true });
      } catch (error) {
        // Directory doesn't exist, which is fine
      }

      // Prepare clone URL with authentication if provided
      let cloneUrl = url;
      if (authToken) {
        // Format: https://token@github.com/user/repo.git
        cloneUrl = url.replace('https://', `https://${authToken}@`);
      }

      logger.info(`Cloning repository: ${url} to ${clonePath}`);

      // Clone the repository
      const git = simpleGit();
      await git.clone(cloneUrl, clonePath, ['--depth', '1000']); // Limit depth for performance

      logger.info(`Repository cloned successfully: ${url}`);

      // Get repository info
      const repoGit = simpleGit(clonePath);
      const log = await repoGit.log();
      const branches = await repoGit.branch();

      return {
        clonePath,
        totalCommits: log.total,
        branches: branches.all,
        latestCommit: log.latest,
      };
    } catch (error) {
      logger.error(`Failed to clone repository ${url}:`, error);
      
      // Clean up on failure
      try {
        await fs.rm(clonePath, { recursive: true, force: true });
      } catch (cleanupError) {
        logger.error('Failed to clean up after clone error:', cleanupError);
      }

      throw new RepositoryCloneError(url, error.message);
    }
  }

  /**
   * Get all files in the cloned repository
   */
  async getRepositoryFiles(repositoryId, extensions = null) {
    const clonePath = this.getClonePath(repositoryId);

    try {
      const files = await this._walkDirectory(clonePath, extensions);
      return files;
    } catch (error) {
      logger.error(`Failed to get repository files:`, error);
      throw error;
    }
  }

  /**
   * Recursively walk directory and collect files
   */
  async _walkDirectory(dir, extensions = null, fileList = []) {
    const files = await fs.readdir(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);

      // Skip .git directory and node_modules
      if (file === '.git' || file === 'node_modules' || file === '.next' || file === 'dist' || file === 'build') {
        continue;
      }

      if (stat.isDirectory()) {
        await this._walkDirectory(filePath, extensions, fileList);
      } else {
        // Filter by extensions if provided
        if (!extensions || extensions.some(ext => file.endsWith(ext))) {
          fileList.push({
            path: filePath,
            relativePath: path.relative(dir, filePath),
            size: stat.size,
            modified: stat.mtime,
          });
        }
      }
    }

    return fileList;
  }

  /**
   * Read file content
   */
  async readFile(repositoryId, relativePath) {
    const clonePath = this.getClonePath(repositoryId);
    const filePath = path.join(clonePath, relativePath);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      logger.error(`Failed to read file ${relativePath}:`, error);
      throw error;
    }
  }

  /**
   * Get Git commit history
   */
  async getCommitHistory(repositoryId, maxCount = 1000) {
    const clonePath = this.getClonePath(repositoryId);

    try {
      const git = simpleGit(clonePath);
      const log = await git.log({ maxCount });

      return log.all.map(commit => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author: commit.author_name,
        email: commit.author_email,
      }));
    } catch (error) {
      logger.error('Failed to get commit history:', error);
      throw error;
    }
  }

  /**
   * Get Git branches
   */
  async getBranches(repositoryId) {
    const clonePath = this.getClonePath(repositoryId);

    try {
      const git = simpleGit(clonePath);
      const branches = await git.branch();

      return {
        all: branches.all,
        current: branches.current,
        branches: branches.branches,
      };
    } catch (error) {
      logger.error('Failed to get branches:', error);
      throw error;
    }
  }

  /**
   * Search for patterns in commit messages
   */
  async searchCommits(repositoryId, pattern) {
    const commits = await this.getCommitHistory(repositoryId);
    const regex = new RegExp(pattern, 'i');

    return commits.filter(commit => 
      regex.test(commit.message) || regex.test(commit.author)
    );
  }

  /**
   * Get repository statistics
   */
  async getRepositoryStats(repositoryId) {
    const clonePath = this.getClonePath(repositoryId);

    try {
      const git = simpleGit(clonePath);
      const log = await git.log();
      const files = await this.getRepositoryFiles(repositoryId);

      // Count files by extension
      const filesByExtension = {};
      files.forEach(file => {
        const ext = path.extname(file.relativePath) || 'no-extension';
        filesByExtension[ext] = (filesByExtension[ext] || 0) + 1;
      });

      // Calculate total size
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);

      return {
        totalCommits: log.total,
        totalFiles: files.length,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        filesByExtension,
        oldestCommit: log.all[log.all.length - 1],
        newestCommit: log.latest,
      };
    } catch (error) {
      logger.error('Failed to get repository stats:', error);
      throw error;
    }
  }

  /**
   * Clean up cloned repository
   */
  async cleanup(repositoryId) {
    const clonePath = this.getClonePath(repositoryId);

    try {
      await fs.rm(clonePath, { recursive: true, force: true });
      logger.info(`Cleaned up repository: ${repositoryId}`);
    } catch (error) {
      logger.error(`Failed to cleanup repository ${repositoryId}:`, error);
      throw error;
    }
  }

  /**
   * Check if repository is cloned
   */
  async isCloned(repositoryId) {
    const clonePath = this.getClonePath(repositoryId);

    try {
      await fs.access(clonePath);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new RepositoryCloner();

// Made with Bob
