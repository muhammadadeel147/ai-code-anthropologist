#!/bin/bash

# AI Code Anthropologist - Quick Start Script
# This script sets up and starts the entire application

set -e  # Exit on error

echo "🤖 AI Code Anthropologist - Quick Start"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Step 1: Check prerequisites
echo "📋 Step 1: Checking prerequisites..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 20+ from https://nodejs.org/"
    exit 1
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js installed: $NODE_VERSION${NC}"
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker from https://www.docker.com/"
    exit 1
else
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✅ Docker installed: $DOCKER_VERSION${NC}"
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose"
    exit 1
else
    COMPOSE_VERSION=$(docker-compose --version)
    echo -e "${GREEN}✅ Docker Compose installed: $COMPOSE_VERSION${NC}"
fi

echo ""

# Step 2: Setup environment variables
echo "🔧 Step 2: Setting up environment variables..."
echo ""

if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env and add your IBM AI API key:${NC}"
    echo -e "${YELLOW}   IBM_WATSONX_API_KEY=your_ibm_api_key_here${NC}"
    echo -e "${YELLOW}   IBM_WATSONX_PROJECT_ID=your_ibm_watsonx_project_id_here${NC}"
    echo -e "${YELLOW}   IBM_WATSONX_URL=your_ibm_watsonx_api_url_here${NC}"
    echo ""
    read -p "Press Enter after you've added your API key..."
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Check if API key is set
if grep -q "your_ibm_watsonx_api_key_here" .env || grep -q "your_ibm_watsonx_project_id_here" .env || grep -q "your_ibm_watsonx_api_url_here" .env; then
    echo -e "${YELLOW}⚠️  Warning: API key not set in .env file${NC}"
    echo "The system will not work without a valid IBM Watsonx API key"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""

# Step 3: Create storage directory
echo "📁 Step 3: Creating storage directory..."
echo ""

mkdir -p storage/repositories
echo -e "${GREEN}✅ Storage directory created${NC}"
echo ""

# Step 4: Start backend services
echo "🚀 Step 4: Starting backend services..."
echo ""

echo "Starting PostgreSQL, Redis, Backend API, and Worker..."
docker-compose up -d postgres redis backend worker

echo ""
echo "Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Backend services started successfully${NC}"
else
    echo -e "${RED}❌ Failed to start backend services${NC}"
    echo "Check logs with: docker-compose logs"
    exit 1
fi

echo ""

# Step 5: Install frontend dependencies
echo "📦 Step 5: Installing frontend dependencies..."
echo ""

cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Frontend dependencies already installed${NC}"
fi

cd ..

echo ""

# Step 6: Display status
echo "✨ Setup Complete!"
echo "=================="
echo ""
echo -e "${GREEN}Backend Services:${NC}"
echo "  - PostgreSQL: Running on port 5432"
echo "  - Redis: Running on port 6379"
echo "  - Backend API: Running on port 4000"
echo "  - Worker: Running and processing jobs"
echo ""
echo -e "${GREEN}Access Points:${NC}"
echo "  - Backend API: http://localhost:4000"
echo "  - API Docs: http://localhost:4000/api-docs"
echo "  - Health Check: http://localhost:4000/health"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Start the frontend:"
echo "     cd frontend && npm run dev"
echo ""
echo "  2. Open your browser:"
echo "     http://localhost:3000"
echo ""
echo "  3. View backend logs:"
echo "     docker-compose logs -f backend worker"
echo ""
echo "  4. Test the API:"
echo "     curl http://localhost:4000/health"
echo ""
echo -e "${GREEN}🎉 Ready to analyze repositories!${NC}"
echo ""

# Ask if user wants to start frontend
read -p "Start frontend development server now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Starting frontend..."
    cd frontend
    npm run dev
fi

# Made with Bob
