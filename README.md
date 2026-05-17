# 🤖 AI Code Anthropologist

An AI-powered tool that analyzes GitHub repositories and automatically generates comprehensive architectural documentation, decision records, knowledge graphs, and an intelligent Q&A system.

## 🌟 Features

- **Automatic Repository Analysis**: Enter any GitHub URL and get instant insights
- **Architecture Decision Records (ADRs)**: Auto-generated documentation of key decisions
- **Knowledge Graph**: Interactive visualization of code relationships and dependencies
- **Intelligent Q&A**: Ask natural language questions about the codebase
- **Risk Analysis**: Identify fragile areas and potential breaking changes
- **Historical Context**: Understand why decisions were made and when

## 🏗️ Architecture

```
ai-code-anthropologist/
├── frontend/          # Next.js web application
├── backend/           # Express API server
│   ├── src/
│   │   ├── api/       # REST API endpoints
│   │   ├── services/  # Business logic
│   │   ├── workers/   # Background job processors
│   │   ├── database/  # Database models and migrations
│   │   └── utils/     # Shared utilities
├── shared/            # Shared TypeScript types
├── storage/           # File storage for analyses
└── docs/              # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Claude API key (from Anthropic)
- GitHub Personal Access Token (optional, for private repos)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-code-anthropologist
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

3. **Start services with Docker**
   ```bash
   npm run setup
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - API Docs: http://localhost:4000/api-docs

### Manual Setup (without Docker)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start PostgreSQL and Redis**
   ```bash
   # Using your preferred method
   ```

3. **Run database migrations**
   ```bash
   cd backend
   npm run migrate
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

## 📖 Usage

### Analyzing a Repository

1. Navigate to http://localhost:3000
2. Enter a GitHub repository URL (e.g., `https://github.com/expressjs/express`)
3. Click "Analyze Repository"
4. Wait for analysis to complete (typically 1-2 hours for medium-sized repos)
5. Explore the results:
   - **ADRs**: Browse architectural decisions
   - **Knowledge Graph**: Visualize code relationships
   - **Q&A**: Ask questions about the codebase
   - **Risks**: Review identified risks

### Example Questions for Q&A

- "Why did we choose PostgreSQL over MongoDB?"
- "What happens if I remove Redis caching?"
- "When was the authentication system implemented?"
- "Why is there a 3-second timeout in the email service?"

## 🛠️ Development

### Project Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── routes/          # API route definitions
│   │   ├── controllers/     # Request handlers
│   │   └── middleware/      # Express middleware
│   ├── services/
│   │   ├── repository/      # Repository cloning & analysis
│   │   ├── ai/              # Claude API integration
│   │   ├── adr/             # ADR generation
│   │   ├── graph/           # Knowledge graph generation
│   │   └── qa/              # Q&A system
│   ├── workers/
│   │   └── analysisWorker.js  # Background job processor
│   ├── database/
│   │   ├── models/          # Database models
│   │   ├── migrations/      # SQL migrations
│   │   └── init.sql         # Initial schema
│   └── utils/
│       ├── logger.js        # Logging utility
│       └── errors.js        # Error handling
├── tests/                   # Test files
├── Dockerfile
└── package.json

frontend/
├── src/
│   ├── app/                 # Next.js app router
│   │   ├── page.tsx         # Landing page
│   │   ├── analysis/        # Analysis progress
│   │   └── dashboard/       # Main dashboard
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── ADRBrowser/
│   │   ├── KnowledgeGraph/
│   │   └── QAInterface/
│   ├── lib/                 # Utilities
│   └── hooks/               # Custom React hooks
├── public/                  # Static assets
├── Dockerfile
└── package.json
```

### Running Tests

```bash
# Run all tests
npm test

# Run backend tests only
npm test --workspace=backend

# Run frontend tests only
npm test --workspace=frontend

# Run with coverage
npm run test:coverage
```

### Code Quality

```bash
# Lint all code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `CLAUDE_API_KEY`: Your Anthropic Claude API key
- `GITHUB_TOKEN`: GitHub personal access token (for private repos)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string

### Worker Configuration

Adjust worker settings in `.env`:
- `MAX_CONCURRENT_JOBS`: Number of parallel analysis jobs (default: 2)
- `JOB_TIMEOUT_MS`: Maximum time for a job (default: 2 hours)

## 📊 API Documentation

### REST API Endpoints

#### Repositories
- `POST /api/repositories` - Submit repository for analysis
- `GET /api/repositories` - List all analyzed repositories
- `GET /api/repositories/:id` - Get repository details
- `DELETE /api/repositories/:id` - Delete repository analysis

#### Analysis Jobs
- `GET /api/jobs/:id` - Get job status
- `POST /api/jobs/:id/cancel` - Cancel running job
- `WS /api/jobs/:id/stream` - Real-time progress updates

#### ADRs
- `GET /api/repositories/:id/adrs` - List all ADRs
- `GET /api/repositories/:id/adrs/:adrId` - Get ADR details
- `POST /api/repositories/:id/adrs/:adrId/export` - Export ADR

#### Knowledge Graph
- `GET /api/repositories/:id/graph` - Get knowledge graph data
- `GET /api/repositories/:id/graph/risks` - Get risk analysis

#### Q&A
- `POST /api/repositories/:id/qa` - Ask a question
- `GET /api/repositories/:id/qa/history` - Get Q&A history

Full API documentation available at: http://localhost:4000/api-docs

## 🧪 Testing Strategy

### Test Coverage Goals
- Unit tests: >80% coverage
- Integration tests: Critical paths
- E2E tests: Main user flows

### Test Repositories
We use these repositories for testing:
- **Small**: 10-50 files (fast tests)
- **Medium**: 100-500 files (realistic scenarios)
- **Large**: 1000+ files (performance tests)

## 🚢 Deployment

### Production Deployment

1. **Build Docker images**
   ```bash
   docker-compose -f docker-compose.prod.yml build
   ```

2. **Deploy to cloud provider**
   - Recommended: AWS ECS, Google Cloud Run, or Railway
   - See `docs/deployment.md` for detailed instructions

3. **Setup monitoring**
   - Configure logging (e.g., CloudWatch, Datadog)
   - Setup alerts for errors and performance

### Scaling Considerations

- **Horizontal scaling**: Add more worker instances
- **Database**: Use managed PostgreSQL (AWS RDS, Supabase)
- **Cache**: Use managed Redis (AWS ElastiCache, Upstash)
- **Storage**: Use S3 or equivalent for file storage

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write tests
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Claude](https://www.anthropic.com/claude) by Anthropic
- Inspired by the need for better architectural documentation
- Thanks to all contributors

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

## 🗺️ Roadmap

- [ ] Support for GitLab and Bitbucket
- [ ] Multi-language support for UI
- [ ] Custom ADR templates
- [ ] Integration with Jira/Linear
- [ ] Export to Confluence/Notion
- [ ] Team collaboration features
- [ ] API access for CI/CD integration

---

**Built with ❤️ by the AI Code Anthropologist team**