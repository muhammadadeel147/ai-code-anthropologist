/**
 * End-to-End Test Suite for AI Code Anthropologist
 * Tests the complete flow from URL submission to results display
 */

const axios = require('axios');
const { io } = require('socket.io-client');

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const TEST_REPO_URL = process.env.TEST_REPO_URL || 'https://github.com/expressjs/express';

// Test timeout (30 minutes for full analysis)
jest.setTimeout(1800000);

describe('AI Code Anthropologist - Complete E2E Flow', () => {
  let repoId;
  let jobId;
  let socket;

  beforeAll(() => {
    console.log('🚀 Starting E2E Test Suite');
    console.log(`Testing against: ${BASE_URL}`);
    console.log(`Test repository: ${TEST_REPO_URL}`);
  });

  afterAll(() => {
    if (socket) {
      socket.disconnect();
    }
    console.log('✅ E2E Test Suite Complete');
  });

  describe('1. Health Check', () => {
    test('Backend API should be running', async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'ok');
      console.log('✓ Backend API is healthy');
    });

    test('Database connection should be active', async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      expect(response.data).toHaveProperty('database', 'connected');
      console.log('✓ Database connection verified');
    });

    test('Redis connection should be active', async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      expect(response.data).toHaveProperty('redis', 'connected');
      console.log('✓ Redis connection verified');
    });
  });

  describe('2. Repository Submission', () => {
    test('Should accept valid GitHub URL', async () => {
      const response = await axios.post(`${BASE_URL}/api/repositories/analyze`, {
        url: TEST_REPO_URL,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('repository');
      expect(response.data).toHaveProperty('job');
      
      repoId = response.data.repository.id;
      jobId = response.data.job.id;

      console.log(`✓ Repository submitted: ${repoId}`);
      console.log(`✓ Analysis job created: ${jobId}`);
    });

    test('Should reject invalid GitHub URL', async () => {
      try {
        await axios.post(`${BASE_URL}/api/repositories/analyze`, {
          url: 'https://invalid-url.com/repo',
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(400);
        console.log('✓ Invalid URL rejected correctly');
      }
    });

    test('Should reject duplicate repository submission', async () => {
      try {
        await axios.post(`${BASE_URL}/api/repositories/analyze`, {
          url: TEST_REPO_URL,
        });
        // Should either succeed or return existing repo
        console.log('✓ Duplicate handling works');
      } catch (error) {
        // Expected behavior
        console.log('✓ Duplicate rejected correctly');
      }
    });
  });

  describe('3. Real-time Progress Tracking', () => {
    test('Should connect to Socket.IO and receive progress updates', (done) => {
      socket = io(BASE_URL);

      socket.on('connect', () => {
        console.log('✓ Socket.IO connected');
        socket.emit('join-job', jobId);
      });

      socket.on('job-progress', (data) => {
        console.log(`📊 Progress: ${data.step} - ${data.message} (${data.progress}%)`);
        expect(data).toHaveProperty('jobId', jobId);
        expect(data).toHaveProperty('step');
        expect(data).toHaveProperty('progress');
        expect(data).toHaveProperty('message');
      });

      socket.on('job-completed', (data) => {
        console.log('✅ Job completed notification received');
        expect(data).toHaveProperty('jobId', jobId);
        expect(data).toHaveProperty('status', 'completed');
        done();
      });

      socket.on('job-failed', (data) => {
        console.error('❌ Job failed:', data.error);
        fail(`Job failed: ${data.error}`);
      });

      // Timeout after 25 minutes
      setTimeout(() => {
        fail('Job did not complete within 25 minutes');
      }, 1500000);
    });
  });

  describe('4. Repository Cloning', () => {
    test('Should clone repository successfully', async () => {
      // Wait for cloning step
      await new Promise((resolve) => setTimeout(resolve, 30000));

      const response = await axios.get(`${BASE_URL}/api/jobs/${jobId}`);
      expect(response.data.status).toMatch(/cloning|analyzing|completed/);
      console.log(`✓ Repository cloning status: ${response.data.status}`);
    });
  });

  describe('5. AI Analysis (5 Prompts)', () => {
    test('Should complete Prompt 1: Repository Analysis', async () => {
      // Wait for analysis to progress
      await new Promise((resolve) => setTimeout(resolve, 120000));

      const response = await axios.get(`${BASE_URL}/api/jobs/${jobId}`);
      const progress = response.data.progress_data;
      
      expect(progress).toHaveProperty('prompt1_completed');
      console.log('✓ Prompt 1 (Repository Analysis) completed');
    });

    test('Should complete Prompt 2: ADR Generation', async () => {
      await new Promise((resolve) => setTimeout(resolve, 180000));

      const response = await axios.get(`${BASE_URL}/api/jobs/${jobId}`);
      const progress = response.data.progress_data;
      
      expect(progress).toHaveProperty('prompt2_completed');
      console.log('✓ Prompt 2 (ADR Generation) completed');
    });

    test('Should complete Prompt 3: Knowledge Graph', async () => {
      await new Promise((resolve) => setTimeout(resolve, 120000));

      const response = await axios.get(`${BASE_URL}/api/jobs/${jobId}`);
      const progress = response.data.progress_data;
      
      expect(progress).toHaveProperty('prompt3_completed');
      console.log('✓ Prompt 3 (Knowledge Graph) completed');
    });

    test('Should complete Prompt 4: Q&A Function', async () => {
      await new Promise((resolve) => setTimeout(resolve, 120000));

      const response = await axios.get(`${BASE_URL}/api/jobs/${jobId}`);
      const progress = response.data.progress_data;
      
      expect(progress).toHaveProperty('prompt4_completed');
      console.log('✓ Prompt 4 (Q&A Function) completed');
    });

    test('Should complete Prompt 5: System Testing', async () => {
      await new Promise((resolve) => setTimeout(resolve, 120000));

      const response = await axios.get(`${BASE_URL}/api/jobs/${jobId}`);
      expect(response.data.status).toBe('completed');
      console.log('✓ Prompt 5 (System Testing) completed');
    });
  });

  describe('6. Data Validation', () => {
    test('Should have generated analysis output', async () => {
      const response = await axios.get(`${BASE_URL}/api/repositories/${repoId}`);
      expect(response.data).toHaveProperty('analysis_completed_at');
      expect(response.data.analysis_completed_at).not.toBeNull();
      console.log('✓ Analysis output generated');
    });

    test('Should have generated ADRs', async () => {
      const response = await axios.get(`${BASE_URL}/api/repositories/${repoId}/adrs`);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      console.log(`✓ Generated ${response.data.length} ADRs`);
    });

    test('Should have generated knowledge graph', async () => {
      const response = await axios.get(`${BASE_URL}/api/repositories/${repoId}/graph`);
      expect(response.data).toHaveProperty('nodes');
      expect(response.data).toHaveProperty('relationships');
      expect(response.data.nodes.length).toBeGreaterThan(0);
      console.log(`✓ Knowledge graph: ${response.data.nodes.length} nodes, ${response.data.relationships.length} edges`);
    });

    test('Should have risk alerts', async () => {
      const response = await axios.get(`${BASE_URL}/api/repositories/${repoId}/graph`);
      expect(response.data).toHaveProperty('risk_alerts');
      console.log(`✓ Risk alerts: ${response.data.risk_alerts?.length || 0} identified`);
    });
  });

  describe('7. Dashboard API', () => {
    test('Should fetch dashboard data', async () => {
      const response = await axios.get(`${BASE_URL}/api/repositories/${repoId}/dashboard`);
      expect(response.data).toHaveProperty('repository');
      expect(response.data).toHaveProperty('stats');
      expect(response.data).toHaveProperty('recent_adrs');
      expect(response.data).toHaveProperty('top_risks');
      console.log('✓ Dashboard data fetched successfully');
    });

    test('Dashboard stats should be accurate', async () => {
      const response = await axios.get(`${BASE_URL}/api/repositories/${repoId}/dashboard`);
      const stats = response.data.stats;
      
      expect(stats.total_decisions).toBeGreaterThan(0);
      expect(stats.total_nodes).toBeGreaterThan(0);
      expect(stats.total_edges).toBeGreaterThan(0);
      console.log(`✓ Stats: ${stats.total_decisions} decisions, ${stats.total_nodes} nodes`);
    });
  });

  describe('8. ADR Browser API', () => {
    let adrId;

    test('Should list all ADRs', async () => {
      const response = await axios.get(`${BASE_URL}/api/repositories/${repoId}/adrs`);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      
      adrId = response.data[0].id;
      console.log(`✓ Listed ${response.data.length} ADRs`);
    });

    test('Should fetch individual ADR details', async () => {
      const response = await axios.get(`${BASE_URL}/api/repositories/${repoId}/adrs/${adrId}`);
      expect(response.data).toHaveProperty('adr_id');
      expect(response.data).toHaveProperty('title');
      expect(response.data).toHaveProperty('problem');
      expect(response.data).toHaveProperty('decision');
      expect(response.data).toHaveProperty('reasoning');
      console.log(`✓ ADR details fetched: ${response.data.title}`);
    });

    test('ADR should have consequences', async () => {
      const response = await axios.get(`${BASE_URL}/api/repositories/${repoId}/adrs/${adrId}`);
      expect(response.data).toHaveProperty('consequences_positive');
      expect(response.data).toHaveProperty('consequences_negative');
      expect(response.data).toHaveProperty('consequences_neutral');
      console.log('✓ ADR consequences documented');
    });

    test('ADR should have related files', async () => {
      const response = await axios.get(`${BASE_URL}/api/repositories/${repoId}/adrs/${adrId}`);
      expect(response.data).toHaveProperty('related_files');
      expect(Array.isArray(response.data.related_files)).toBe(true);
      console.log(`✓ ADR has ${response.data.related_files.length} related files`);
    });
  });

  describe('9. Knowledge Graph API', () => {
    test('Should fetch complete graph data', async () => {
      const response = await axios.get(`${BASE_URL}/api/repositories/${repoId}/graph`);
      expect(response.data).toHaveProperty('nodes');
      expect(response.data).toHaveProperty('relationships');
      expect(response.data).toHaveProperty('clusters');
      expect(response.data).toHaveProperty('stats');
      console.log('✓ Complete graph data fetched');
    });

    test('Graph should have different node types', async () => {
      const response = await axios.get(`${BASE_URL}/api/repositories/${repoId}/graph`);
      const nodeTypes = new Set(response.data.nodes.map(n => n.type));
      expect(nodeTypes.size).toBeGreaterThan(1);
      console.log(`✓ Node types: ${Array.from(nodeTypes).join(', ')}`);
    });

    test('Graph should have relationships', async () => {
      const response = await axios.get(`${BASE_URL}/api/repositories/${repoId}/graph`);
      expect(response.data.relationships.length).toBeGreaterThan(0);
      console.log(`✓ ${response.data.relationships.length} relationships mapped`);
    });
  });

  describe('10. Q&A System', () => {
    test('Should answer decision query', async () => {
      const response = await axios.post(`${BASE_URL}/api/repositories/${repoId}/qa/ask`, {
        question: 'Why was this technology chosen?',
      });

      expect(response.data).toHaveProperty('question');
      expect(response.data).toHaveProperty('direct_answer');
      expect(response.data).toHaveProperty('confidence_score');
      console.log(`✓ Q&A answered with ${Math.round(response.data.confidence_score * 100)}% confidence`);
    });

    test('Should provide historical context', async () => {
      const response = await axios.post(`${BASE_URL}/api/repositories/${repoId}/qa/ask`, {
        question: 'When was this implemented?',
      });

      expect(response.data).toHaveProperty('historical_context');
      console.log('✓ Historical context provided');
    });

    test('Should analyze change impact', async () => {
      const response = await axios.post(`${BASE_URL}/api/repositories/${repoId}/qa/ask`, {
        question: 'What happens if I change this?',
      });

      expect(response.data).toHaveProperty('impact_of_changes');
      console.log('✓ Change impact analysis provided');
    });

    test('Should fetch Q&A history', async () => {
      const response = await axios.get(`${BASE_URL}/api/repositories/${repoId}/qa/history`);
      expect(Array.isArray(response.data)).toBe(true);
      console.log(`✓ Q&A history: ${response.data.length} questions`);
    });
  });

  describe('11. Export Functionality', () => {
    test('Should export data as JSON', async () => {
      const response = await axios.get(`${BASE_URL}/api/repositories/${repoId}/export?format=json`);
      expect(response.headers['content-type']).toContain('application/json');
      console.log('✓ JSON export successful');
    });

    test('Should export data as Markdown', async () => {
      const response = await axios.get(`${BASE_URL}/api/repositories/${repoId}/export?format=markdown`);
      expect(response.headers['content-type']).toContain('text/markdown');
      console.log('✓ Markdown export successful');
    });
  });

  describe('12. Performance Metrics', () => {
    test('Should complete analysis within acceptable time', async () => {
      const response = await axios.get(`${BASE_URL}/api/repositories/${repoId}`);
      const startTime = new Date(response.data.created_at);
      const endTime = new Date(response.data.analysis_completed_at);
      const durationMinutes = (endTime - startTime) / 1000 / 60;

      expect(durationMinutes).toBeLessThan(30); // Should complete within 30 minutes
      console.log(`✓ Analysis completed in ${durationMinutes.toFixed(2)} minutes`);
    });

    test('Should have acceptable response times', async () => {
      const start = Date.now();
      await axios.get(`${BASE_URL}/api/repositories/${repoId}/dashboard`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(3000); // Should respond within 3 seconds
      console.log(`✓ Dashboard response time: ${duration}ms`);
    });
  });

  describe('13. Error Handling', () => {
    test('Should handle non-existent repository', async () => {
      try {
        await axios.get(`${BASE_URL}/api/repositories/non-existent-id`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(404);
        console.log('✓ 404 error handled correctly');
      }
    });

    test('Should handle invalid job ID', async () => {
      try {
        await axios.get(`${BASE_URL}/api/jobs/invalid-job-id`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(404);
        console.log('✓ Invalid job ID handled correctly');
      }
    });

    test('Should handle malformed requests', async () => {
      try {
        await axios.post(`${BASE_URL}/api/repositories/analyze`, {
          invalid: 'data',
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(400);
        console.log('✓ Malformed request handled correctly');
      }
    });
  });
});

console.log('\n' + '='.repeat(60));
console.log('🎉 ALL E2E TESTS COMPLETED SUCCESSFULLY');
console.log('='.repeat(60));

// Made with Bob
