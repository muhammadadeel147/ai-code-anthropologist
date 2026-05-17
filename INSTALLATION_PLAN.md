# 🚀 AI Code Anthropologist - Installation & Setup Plan

## Overview
This document provides a step-by-step plan to install dependencies and run the AI Code Anthropologist project on Windows.

## Prerequisites Checklist
- ✅ Node.js 20+ installed
- ✅ Docker Desktop installed and running
- ✅ Docker Compose available
- ✅ IBM Watsonx API key
- ✅ GitHub Personal Access Token (optional)

## Installation Methods

### Method 1: Automated Setup (Recommended) ⭐

The project includes a `QUICK_START.bat` script that automates the entire setup process.

**Steps:**

1. **Run the Quick Start Script**
   ```cmd
   QUICK_START.bat
   ```

   This script will:
   - ✅ Check Node.js, Docker, and Docker Compose installation
   - ✅ Create `.env` file from `.env.example`
   - ✅ Create storage directories
   - ✅ Start Docker services (PostgreSQL, Redis, Backend API, Worker)
   - ✅ Install frontend dependencies
   - ✅ Prompt to start the frontend server

2. **Configure API Keys**
   
   When prompted, edit the `.env` file and add your API keys:
   ```env
   IBM_WATSONX_API_KEY=your_actual_ibm_watsonx_api_key_here
   IBM_WATSONX_PROJECT_ID=your_ibm_watsonx_project_id_here
   IBM_WATSONX_URL=your_ibm_watsonx_api_url_here
   GITHUB_TOKEN=your_github_token_here  # Optional
   ```

3. **Start Frontend** (if not started automatically)
   ```cmd
   cd frontend
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - API Docs: http://localhost:4000/api-docs
   - Health Check: http://localhost:4000/health

---

### Method 2: Manual Setup (Alternative)

If you prefer manual control or the script encounters issues:

#### Step 1: Environment Configuration
```cmd
# Copy environment template
copy .env.example .env

# Edit .env and add your API keys
notepad .env
```

Required variables in `.env`:
```env
IBM_WATSONX_API_KEY=your_ibm_watsonx_api_key_here
IBM_WATSONX_PROJECT_ID=your_ibm_watsonx_project_id_here
IBM_WATSONX_URL=your_ibm_watsonx_api_url_here
GITHUB_TOKEN=your_github_token_here  # Optional
DATABASE_URL=postgresql://anthropologist:dev_password_change_in_prod@localhost:5432/ai_anthropologist
REDIS_URL=redis://localhost:6379
```

#### Step 2: Create Storage Directory
```cmd
mkdir storage\repositories
```

#### Step 3: Start Docker Services
```cmd
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be ready (10 seconds)
timeout /t 10

# Start Backend API and Worker
docker-compose up -d backend worker
```

#### Step 4: Install Frontend Dependencies
```cmd
cd frontend
npm install
cd ..
```

#### Step 5: Start Frontend Development Server
```cmd
cd frontend
npm run dev
```

---

## Project Structure

```
ai-code-anthropologist/
├── frontend/              # Next.js application
│   ├── src/
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities
│   └── package.json      # Frontend dependencies
│
├── backend/              # Express API server
│   ├── src/
│   │   ├── api/         # REST endpoints
│   │   ├── services/    # Business logic
│   │   ├── workers/     # Background jobs
│   │   └── database/    # DB models & migrations
│   └── package.json     # Backend dependencies
│
├── storage/             # Repository storage
├── docker-compose.yml   # Docker services config
└── package.json         # Root workspace config
```

---

## Service Architecture

```mermaid
graph TB
    A[Frontend - Next.js<br/>Port 3000] --> B[Backend API - Express<br/>Port 4000]
    B --> C[PostgreSQL<br/>Port 5432]
    B --> D[Redis<br/>Port 6379]
    E[Worker Process] --> D
    E --> C
    E --> F[Claude AI API]
    B --> F
    
    style A fill:#61dafb
    style B fill:#68a063
    style C fill:#336791
    style D fill:#dc382d
    style E fill:#ffa500
    style F fill:#8b5cf6
```

---

## Verification Steps

### 1. Check Docker Services
```cmd
docker-compose ps
```

Expected output:
```
NAME                          STATUS
ai-anthropologist-backend     Up
ai-anthropologist-db          Up (healthy)
ai-anthropologist-redis       Up (healthy)
ai-anthropologist-worker      Up
```

### 2. Test Backend API
```cmd
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-05-17T11:23:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### 3. Check Frontend
Open browser: http://localhost:3000

You should see the AI Code Anthropologist landing page.

---

## Common Commands

### Development
```cmd
# Start all services
npm run dev

# Start backend only
npm run dev:backend

# Start frontend only
npm run dev:frontend

# View logs
docker-compose logs -f backend worker
```

### Docker Management
```cmd
# Stop all services
docker-compose down

# Restart services
docker-compose restart

# Rebuild containers
docker-compose up -d --build

# View service status
docker-compose ps
```

### Database
```cmd
# Run migrations
cd backend
npm run migrate

# Access PostgreSQL
docker exec -it ai-anthropologist-db psql -U anthropologist -d ai_anthropologist
```

---

## Troubleshooting

### Issue: Docker services won't start
**Solution:**
```cmd
# Check Docker Desktop is running
docker --version

# Check for port conflicts
netstat -ano | findstr "3000 4000 5432 6379"

# Restart Docker Desktop
```

### Issue: Backend can't connect to database
**Solution:**
```cmd
# Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Issue: Frontend build errors
**Solution:**
```cmd
cd frontend

# Clear cache and reinstall
rmdir /s /q node_modules
rmdir /s /q .next
npm install
npm run dev
```

### Issue: API key not working
**Solution:**
1. Verify `.env` file exists in project root
2. Check API key format (no quotes, no spaces)
3. Restart backend service:
   ```cmd
   docker-compose restart backend worker
   ```

---

## Next Steps After Installation

1. **Test the Application**
   - Navigate to http://localhost:3000
   - Enter a GitHub repository URL (e.g., `https://github.com/expressjs/express`)
   - Click "Analyze Repository"
   - Monitor progress in real-time

2. **Explore Features**
   - View generated ADRs (Architecture Decision Records)
   - Explore the interactive Knowledge Graph
   - Ask questions using the Q&A interface
   - Review risk analysis

3. **Development Workflow**
   - Backend changes: Auto-reload with nodemon
   - Frontend changes: Hot reload with Next.js
   - Database changes: Run migrations with `npm run migrate`

---

## Resource Requirements

### Minimum
- CPU: 2 cores
- RAM: 4 GB
- Disk: 10 GB free space

### Recommended
- CPU: 4+ cores
- RAM: 8+ GB
- Disk: 20+ GB free space
- SSD for better performance

---

## Support & Documentation

- **README**: [`README.md`](README.md)
- **Implementation Guide**: [`IMPLEMENTATION_GUIDE.md`](IMPLEMENTATION_GUIDE.md)
- **Project Summary**: [`FINAL_PROJECT_SUMMARY.md`](FINAL_PROJECT_SUMMARY.md)
- **API Documentation**: http://localhost:4000/api-docs (when running)

---

## Quick Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 4000 | http://localhost:4000 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |

| Command | Description |
|---------|-------------|
| `QUICK_START.bat` | Automated setup |
| `npm run dev` | Start all services |
| `docker-compose up -d` | Start Docker services |
| `docker-compose down` | Stop all services |
| `docker-compose logs -f` | View logs |

---

**Ready to analyze repositories! 🚀**