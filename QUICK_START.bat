@echo off
REM AI Code Anthropologist - Quick Start Script for Windows
REM This script sets up and starts the entire application

echo.
echo AI Code Anthropologist - Quick Start
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo Error: Please run this script from the project root directory
    exit /b 1
)

REM Step 1: Check prerequisites
echo Step 1: Checking prerequisites...
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js 20+ from https://nodejs.org/
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
    echo [OK] Node.js installed: %NODE_VERSION%
)

REM Check Docker
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not installed
    echo Please install Docker Desktop from https://www.docker.com/
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('docker --version') do set DOCKER_VERSION=%%i
    echo [OK] Docker installed: %DOCKER_VERSION%
)

REM Check Docker Compose
where docker-compose >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker Compose is not installed
    echo Please install Docker Compose
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('docker-compose --version') do set COMPOSE_VERSION=%%i
    echo [OK] Docker Compose installed: %COMPOSE_VERSION%
)

echo.

REM Step 2: Setup environment variables
echo Step 2: Setting up environment variables...
echo.

if not exist ".env" (
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo.
    echo [WARNING] Please edit .env and add your IBM AI API key:
    echo    IBM_WATSONX_API_KEY=your_ibm_api_key_here
    echo    IBM_WATSONX_PROJECT_ID=your_ibm_watsonx_project_id_here
    echo    IBM_WATSONX_URL=your_ibm_watsonx_api_url_here
    echo.
    pause
) else (
    echo [OK] .env file already exists
)

echo.

REM Step 3: Create storage directory
echo Step 3: Creating storage directory...
echo.

if not exist "storage\repositories" mkdir storage\repositories
echo [OK] Storage directory created
echo.

REM Step 4: Start backend services
echo Step 4: Starting backend services...
echo.

echo Starting PostgreSQL, Redis, Backend API, and Worker...
docker-compose up -d postgres redis backend worker
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to start backend services
    echo Please review the Docker build output above, then run:
    echo    docker-compose up -d postgres redis backend worker
    exit /b 1
)

echo.
echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo [OK] Backend services started successfully
echo.

REM Step 5: Install frontend dependencies
echo Step 5: Installing frontend dependencies...
echo.

cd frontend

if not exist "node_modules" (
    echo Installing npm packages...
    call npm install
    echo [OK] Frontend dependencies installed
) else (
    echo [OK] Frontend dependencies already installed
)

cd ..

echo.

REM Step 6: Display status
echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Backend Services:
echo   - PostgreSQL: Running on port 5432
echo   - Redis: Running on port 6379
echo   - Backend API: Running on port 4000
echo   - Worker: Running and processing jobs
echo.
echo Access Points:
echo   - Backend API: http://localhost:4000
echo   - API Docs: http://localhost:4000/api-docs
echo   - Health Check: http://localhost:4000/health
echo.
echo Next Steps:
echo   1. Start the frontend:
echo      cd frontend
echo      npm run dev
echo.
echo   2. Open your browser:
echo      http://localhost:3000
echo.
echo   3. View backend logs:
echo      docker-compose logs -f backend worker
echo.
echo   4. Test the API:
echo      curl http://localhost:4000/health
echo.
echo Ready to analyze repositories!
echo.

REM Ask if user wants to start frontend
set /p START_FRONTEND="Start frontend development server now? (y/n): "
if /i "%START_FRONTEND%"=="y" (
    echo.
    echo Starting frontend...
    cd frontend
    call npm run dev
)

@REM Made with Bob
