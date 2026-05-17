#!/bin/bash

###############################################################################
# AI Code Anthropologist - Production Deployment Script
# Supports: AWS, Azure, Google Cloud, DigitalOcean, Self-Hosted
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV=${DEPLOYMENT_ENV:-production}
PLATFORM=${PLATFORM:-docker}
PROJECT_NAME="ai-code-anthropologist"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   AI Code Anthropologist - Production Deployment          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_status "Docker installed"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_status "Docker Compose installed"
    
    # Check Git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed"
        exit 1
    fi
    print_status "Git installed"
    
    echo ""
}

# Load environment variables
load_environment() {
    print_info "Loading environment configuration..."
    
    if [ ! -f ".env.production" ]; then
        print_error ".env.production file not found"
        print_info "Creating from template..."
        cp .env.example .env.production
        print_warning "Please configure .env.production before deploying"
        exit 1
    fi
    
    source .env.production
    print_status "Environment loaded"
    echo ""
}

# Build Docker images
build_images() {
    print_info "Building Docker images..."
    
    # Build backend
    print_info "Building backend image..."
    docker build -t ${PROJECT_NAME}-backend:latest -f backend/Dockerfile backend/
    print_status "Backend image built"
    
    # Build frontend
    print_info "Building frontend image..."
    docker build -t ${PROJECT_NAME}-frontend:latest -f frontend/Dockerfile frontend/
    print_status "Frontend image built"
    
    # Build worker
    print_info "Building worker image..."
    docker build -t ${PROJECT_NAME}-worker:latest -f backend/Dockerfile.worker backend/
    print_status "Worker image built"
    
    echo ""
}

# Setup database
setup_database() {
    print_info "Setting up database..."
    
    # Start PostgreSQL
    docker-compose -f docker-compose.prod.yml up -d postgres
    
    # Wait for PostgreSQL to be ready
    print_info "Waiting for PostgreSQL to be ready..."
    sleep 10
    
    # Run migrations
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} < backend/database/init.sql
    
    print_status "Database setup complete"
    echo ""
}

# Setup Redis
setup_redis() {
    print_info "Setting up Redis..."
    
    docker-compose -f docker-compose.prod.yml up -d redis
    
    print_status "Redis setup complete"
    echo ""
}

# Deploy services
deploy_services() {
    print_info "Deploying services..."
    
    # Stop existing services
    print_info "Stopping existing services..."
    docker-compose -f docker-compose.prod.yml down
    
    # Start all services
    print_info "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    print_status "Services deployed"
    echo ""
}

# Health check
health_check() {
    print_info "Running health checks..."
    
    # Wait for services to start
    sleep 15
    
    # Check backend
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        print_status "Backend is healthy"
    else
        print_error "Backend health check failed"
        return 1
    fi
    
    # Check frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_status "Frontend is healthy"
    else
        print_error "Frontend health check failed"
        return 1
    fi
    
    echo ""
}

# Setup monitoring
setup_monitoring() {
    print_info "Setting up monitoring..."
    
    # Create monitoring directory
    mkdir -p monitoring/prometheus
    mkdir -p monitoring/grafana
    
    # Copy monitoring configs
    cp deploy/monitoring/prometheus.yml monitoring/prometheus/
    cp deploy/monitoring/grafana-dashboard.json monitoring/grafana/
    
    # Start monitoring stack
    docker-compose -f docker-compose.monitoring.yml up -d
    
    print_status "Monitoring setup complete"
    print_info "Prometheus: http://localhost:9090"
    print_info "Grafana: http://localhost:3003 (admin/admin)"
    echo ""
}

# Setup SSL/TLS
setup_ssl() {
    print_info "Setting up SSL/TLS..."
    
    if [ -z "$DOMAIN" ]; then
        print_warning "DOMAIN not set, skipping SSL setup"
        return
    fi
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        print_info "Installing certbot..."
        apt-get update && apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Obtain certificate
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $SSL_EMAIL
    
    print_status "SSL/TLS setup complete"
    echo ""
}

# Setup backup
setup_backup() {
    print_info "Setting up automated backups..."
    
    # Create backup directory
    mkdir -p backups
    
    # Create backup script
    cat > backups/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup database
docker exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > $BACKUP_DIR/db_$TIMESTAMP.sql

# Backup uploaded files
tar -czf $BACKUP_DIR/files_$TIMESTAMP.tar.gz /app/uploads

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $TIMESTAMP"
EOF
    
    chmod +x backups/backup.sh
    
    # Add to crontab (daily at 2 AM)
    (crontab -l 2>/dev/null; echo "0 2 * * * /path/to/backups/backup.sh") | crontab -
    
    print_status "Backup setup complete"
    echo ""
}

# Setup logging
setup_logging() {
    print_info "Setting up centralized logging..."
    
    # Create logs directory
    mkdir -p logs
    
    # Setup log rotation
    cat > /etc/logrotate.d/ai-code-anthropologist << EOF
/var/log/ai-code-anthropologist/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
}
EOF
    
    print_status "Logging setup complete"
    echo ""
}

# Deploy to cloud platform
deploy_to_cloud() {
    case $PLATFORM in
        aws)
            deploy_to_aws
            ;;
        azure)
            deploy_to_azure
            ;;
        gcp)
            deploy_to_gcp
            ;;
        digitalocean)
            deploy_to_digitalocean
            ;;
        *)
            print_info "Using Docker deployment"
            ;;
    esac
}

# AWS deployment
deploy_to_aws() {
    print_info "Deploying to AWS..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not installed"
        exit 1
    fi
    
    # Push images to ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    
    docker tag ${PROJECT_NAME}-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${PROJECT_NAME}-backend:latest
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${PROJECT_NAME}-backend:latest
    
    docker tag ${PROJECT_NAME}-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${PROJECT_NAME}-frontend:latest
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${PROJECT_NAME}-frontend:latest
    
    # Deploy to ECS
    aws ecs update-service --cluster ${PROJECT_NAME}-cluster --service ${PROJECT_NAME}-service --force-new-deployment
    
    print_status "AWS deployment complete"
}

# Azure deployment
deploy_to_azure() {
    print_info "Deploying to Azure..."
    
    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI not installed"
        exit 1
    fi
    
    # Login to Azure Container Registry
    az acr login --name $AZURE_REGISTRY_NAME
    
    # Push images
    docker tag ${PROJECT_NAME}-backend:latest $AZURE_REGISTRY_NAME.azurecr.io/${PROJECT_NAME}-backend:latest
    docker push $AZURE_REGISTRY_NAME.azurecr.io/${PROJECT_NAME}-backend:latest
    
    docker tag ${PROJECT_NAME}-frontend:latest $AZURE_REGISTRY_NAME.azurecr.io/${PROJECT_NAME}-frontend:latest
    docker push $AZURE_REGISTRY_NAME.azurecr.io/${PROJECT_NAME}-frontend:latest
    
    # Deploy to Azure Container Instances
    az container create --resource-group $AZURE_RESOURCE_GROUP --name ${PROJECT_NAME} --image $AZURE_REGISTRY_NAME.azurecr.io/${PROJECT_NAME}-backend:latest
    
    print_status "Azure deployment complete"
}

# Google Cloud deployment
deploy_to_gcp() {
    print_info "Deploying to Google Cloud..."
    
    # Check gcloud CLI
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI not installed"
        exit 1
    fi
    
    # Configure Docker for GCR
    gcloud auth configure-docker
    
    # Push images to GCR
    docker tag ${PROJECT_NAME}-backend:latest gcr.io/$GCP_PROJECT_ID/${PROJECT_NAME}-backend:latest
    docker push gcr.io/$GCP_PROJECT_ID/${PROJECT_NAME}-backend:latest
    
    docker tag ${PROJECT_NAME}-frontend:latest gcr.io/$GCP_PROJECT_ID/${PROJECT_NAME}-frontend:latest
    docker push gcr.io/$GCP_PROJECT_ID/${PROJECT_NAME}-frontend:latest
    
    # Deploy to Cloud Run
    gcloud run deploy ${PROJECT_NAME}-backend --image gcr.io/$GCP_PROJECT_ID/${PROJECT_NAME}-backend:latest --platform managed --region $GCP_REGION
    gcloud run deploy ${PROJECT_NAME}-frontend --image gcr.io/$GCP_PROJECT_ID/${PROJECT_NAME}-frontend:latest --platform managed --region $GCP_REGION
    
    print_status "Google Cloud deployment complete"
}

# DigitalOcean deployment
deploy_to_digitalocean() {
    print_info "Deploying to DigitalOcean..."
    
    # Check doctl CLI
    if ! command -v doctl &> /dev/null; then
        print_error "doctl CLI not installed"
        exit 1
    fi
    
    # Login to DigitalOcean Container Registry
    doctl registry login
    
    # Push images
    docker tag ${PROJECT_NAME}-backend:latest registry.digitalocean.com/$DO_REGISTRY_NAME/${PROJECT_NAME}-backend:latest
    docker push registry.digitalocean.com/$DO_REGISTRY_NAME/${PROJECT_NAME}-backend:latest
    
    docker tag ${PROJECT_NAME}-frontend:latest registry.digitalocean.com/$DO_REGISTRY_NAME/${PROJECT_NAME}-frontend:latest
    docker push registry.digitalocean.com/$DO_REGISTRY_NAME/${PROJECT_NAME}-frontend:latest
    
    # Deploy to App Platform
    doctl apps create --spec deploy/digitalocean/app.yaml
    
    print_status "DigitalOcean deployment complete"
}

# Print deployment summary
print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          Deployment Completed Successfully!               ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Service URLs:${NC}"
    echo -e "  Frontend:  http://localhost:3000"
    echo -e "  Backend:   http://localhost:3001"
    echo -e "  API Docs:  http://localhost:3001/api-docs"
    echo ""
    echo -e "${BLUE}Monitoring:${NC}"
    echo -e "  Prometheus: http://localhost:9090"
    echo -e "  Grafana:    http://localhost:3003"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo -e "  1. Configure your domain DNS"
    echo -e "  2. Setup SSL certificates"
    echo -e "  3. Configure monitoring alerts"
    echo -e "  4. Test the complete flow"
    echo ""
    echo -e "${YELLOW}Important:${NC}"
    echo -e "  - Review security settings"
    echo -e "  - Setup automated backups"
    echo -e "  - Configure rate limiting"
    echo -e "  - Monitor resource usage"
    echo ""
}

# Main deployment flow
main() {
    check_prerequisites
    load_environment
    build_images
    setup_database
    setup_redis
    deploy_services
    health_check
    setup_monitoring
    setup_logging
    setup_backup
    
    # Cloud deployment if specified
    if [ "$PLATFORM" != "docker" ]; then
        deploy_to_cloud
    fi
    
    print_summary
}

# Run main function
main "$@"

# Made with Bob
