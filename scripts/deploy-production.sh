#!/bin/bash

# ApexFit AI Production Deployment Script
# This script handles the complete production deployment process

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env.production"
BACKUP_DIR="${BACKUP_PATH:-/opt/apexfit/backups}"
LOG_FILE="/var/log/apexfit-deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        warn "Running as root. Consider using a dedicated user for deployment."
    fi
}

# Validate environment
validate_environment() {
    log "Validating deployment environment..."
    
    # Check if .env.production exists
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Environment file not found: $ENV_FILE"
    fi
    
    # Source environment variables
    source "$ENV_FILE"
    
    # Check required variables
    local required_vars=(
        "DOMAIN"
        "SECRET_KEY"
        "REDIS_PASSWORD"
        "DATA_PATH"
        "UPLOADS_PATH"
        "EXPORTS_PATH"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable not set: $var"
        fi
    done
    
    # Check Docker availability
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed or not in PATH"
    fi
    
    success "Environment validation passed"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    local dirs=(
        "$DATA_PATH"
        "$UPLOADS_PATH"
        "$EXPORTS_PATH"
        "$RESULTS_PATH"
        "$BACKUP_PATH"
        "$(dirname "$LOG_FILE")"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            log "Creating directory: $dir"
            mkdir -p "$dir"
            chmod 755 "$dir"
        fi
    done
    
    success "Directories created successfully"
}

# Backup existing data
backup_data() {
    log "Creating backup of existing data..."
    
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="apexfit_backup_${backup_timestamp}"
    local backup_full_path="${BACKUP_DIR}/${backup_name}"
    
    mkdir -p "$backup_full_path"
    
    # Backup data directory
    if [[ -d "$DATA_PATH" && "$(ls -A "$DATA_PATH" 2>/dev/null)" ]]; then
        log "Backing up data directory..."
        cp -r "$DATA_PATH" "${backup_full_path}/data"
    fi
    
    # Backup uploads directory  
    if [[ -d "$UPLOADS_PATH" && "$(ls -A "$UPLOADS_PATH" 2>/dev/null)" ]]; then
        log "Backing up uploads directory..."
        cp -r "$UPLOADS_PATH" "${backup_full_path}/uploads"
    fi
    
    # Create backup manifest
    cat > "${backup_full_path}/manifest.txt" << EOF
Backup created: $(date)
Environment: ${ENVIRONMENT:-production}
Version: ${APP_VERSION:-unknown}
Data path: $DATA_PATH
Uploads path: $UPLOADS_PATH
Exports path: $EXPORTS_PATH
EOF
    
    # Compress backup
    log "Compressing backup..."
    cd "$BACKUP_DIR"
    tar -czf "${backup_name}.tar.gz" "$backup_name"
    rm -rf "$backup_name"
    
    success "Backup created: ${BACKUP_DIR}/${backup_name}.tar.gz"
    
    # Clean old backups
    cleanup_old_backups
}

# Clean up old backups
cleanup_old_backups() {
    local retention_days="${BACKUP_RETENTION_DAYS:-30}"
    log "Cleaning up backups older than $retention_days days..."
    
    find "$BACKUP_DIR" -name "apexfit_backup_*.tar.gz" -mtime +$retention_days -delete
    
    success "Old backups cleaned up"
}

# Pull latest images
pull_images() {
    log "Pulling latest container images..."
    
    cd "$PROJECT_ROOT"
    
    # Pull with docker-compose
    docker-compose -f docker-compose.prod.yml --env-file "$ENV_FILE" pull
    
    success "Container images pulled successfully"
}

# Deploy application
deploy_application() {
    log "Deploying ApexFit AI application..."
    
    cd "$PROJECT_ROOT"
    
    # Stop existing containers gracefully
    log "Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml --env-file "$ENV_FILE" down --timeout 30
    
    # Start new containers
    log "Starting new containers..."
    docker-compose -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d
    
    success "Application deployed successfully"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Wait for services to start
    sleep 30
    
    # Check service health
    local frontend_url="http://localhost:${FRONTEND_PORT:-3000}/api/health"
    local backend_url="http://localhost:${BACKEND_PORT:-8000}/health"
    
    log "Checking frontend health..."
    if curl -f -s "$frontend_url" > /dev/null; then
        success "Frontend is healthy"
    else
        error "Frontend health check failed"
    fi
    
    log "Checking backend health..."
    if curl -f -s "$backend_url" > /dev/null; then
        success "Backend is healthy"
    else
        error "Backend health check failed"
    fi
    
    # Check container status
    log "Checking container status..."
    docker-compose -f docker-compose.prod.yml --env-file "$ENV_FILE" ps
    
    success "Deployment verification completed"
}

# Monitor deployment
monitor_deployment() {
    log "Setting up monitoring..."
    
    # Start monitoring services if enabled
    if [[ "${ENABLE_MONITORING:-false}" == "true" ]]; then
        log "Starting monitoring services..."
        docker-compose -f docker-compose.prod.yml --env-file "$ENV_FILE" --profile monitoring up -d
        
        # Wait for monitoring to start
        sleep 15
        
        local prometheus_url="http://localhost:${PROMETHEUS_PORT:-9090}"
        local grafana_url="http://localhost:${GRAFANA_PORT:-3001}"
        
        log "Prometheus available at: $prometheus_url"
        log "Grafana available at: $grafana_url"
    fi
    
    success "Monitoring setup completed"
}

# Update deployment timestamp
update_deployment_info() {
    log "Updating deployment information..."
    
    # Update environment file with deployment timestamp
    if grep -q "DEPLOY_TIMESTAMP=" "$ENV_FILE"; then
        sed -i "s/DEPLOY_TIMESTAMP=.*/DEPLOY_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)/" "$ENV_FILE"
    else
        echo "DEPLOY_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$ENV_FILE"
    fi
    
    success "Deployment information updated"
}

# Send deployment notification (optional)
send_notification() {
    if [[ -n "${WEBHOOK_URL:-}" ]]; then
        log "Sending deployment notification..."
        
        local payload=$(cat << EOF
{
    "text": "🚀 ApexFit AI deployed successfully",
    "attachments": [
        {
            "color": "good",
            "fields": [
                {
                    "title": "Environment",
                    "value": "${ENVIRONMENT:-production}",
                    "short": true
                },
                {
                    "title": "Version",
                    "value": "${APP_VERSION:-unknown}",
                    "short": true
                },
                {
                    "title": "Timestamp",
                    "value": "$(date)",
                    "short": false
                }
            ]
        }
    ]
}
EOF
        )
        
        curl -X POST -H 'Content-type: application/json' \
             --data "$payload" \
             "$WEBHOOK_URL" || warn "Failed to send notification"
    fi
}

# Print deployment summary
print_summary() {
    cat << EOF

${GREEN}=====================================${NC}
${GREEN}  ApexFit AI Deployment Complete!   ${NC}
${GREEN}=====================================${NC}

Application URLs:
  Frontend: https://${DOMAIN}
  Backend API: https://${DOMAIN}/python-api

$(if [[ "${ENABLE_MONITORING:-false}" == "true" ]]; then
echo "Monitoring URLs:
  Prometheus: http://localhost:${PROMETHEUS_PORT:-9090}
  Grafana: http://localhost:${GRAFANA_PORT:-3001}"
fi)

Logs:
  Deployment: $LOG_FILE
  Application: docker-compose -f docker-compose.prod.yml logs -f

Management:
  View status: docker-compose -f docker-compose.prod.yml ps
  Restart: docker-compose -f docker-compose.prod.yml restart
  Stop: docker-compose -f docker-compose.prod.yml down

${GREEN}=====================================${NC}

EOF
}

# Rollback function
rollback() {
    log "Rolling back deployment..."
    
    # Stop current containers
    docker-compose -f docker-compose.prod.yml --env-file "$ENV_FILE" down
    
    # Restore from latest backup
    local latest_backup=$(find "$BACKUP_DIR" -name "apexfit_backup_*.tar.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    
    if [[ -n "$latest_backup" ]]; then
        log "Restoring from backup: $latest_backup"
        cd "$BACKUP_DIR"
        tar -xzf "$latest_backup"
        
        local backup_name=$(basename "$latest_backup" .tar.gz)
        cp -r "${backup_name}/data/"* "$DATA_PATH/"
        cp -r "${backup_name}/uploads/"* "$UPLOADS_PATH/"
        
        rm -rf "$backup_name"
        
        success "Rollback completed"
    else
        error "No backup found for rollback"
    fi
}

# Main deployment function
main() {
    log "Starting ApexFit AI production deployment..."
    
    check_permissions
    validate_environment
    create_directories
    backup_data
    pull_images
    deploy_application
    verify_deployment
    monitor_deployment
    update_deployment_info
    send_notification
    print_summary
    
    success "Production deployment completed successfully!"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "verify")
        verify_deployment
        ;;
    "backup")
        backup_data
        ;;
    *)
        echo "Usage: $0 [deploy|rollback|verify|backup]"
        exit 1
        ;;
esac