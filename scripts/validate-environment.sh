#!/bin/bash

# ApexFit AI Environment Validation Script
# Validates production environment setup and readiness

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env.production"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
CHECKS_TOTAL=0
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNINGS=0

# Logging
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((CHECKS_PASSED++))
}

error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((CHECKS_FAILED++))
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((CHECKS_WARNINGS++))
}

check() {
    ((CHECKS_TOTAL++))
}

# Check functions
check_docker() {
    log "Checking Docker installation..."
    check
    
    if command -v docker &> /dev/null; then
        local docker_version=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        success "Docker installed: $docker_version"
        
        # Check if Docker daemon is running
        if docker ps &> /dev/null; then
            success "Docker daemon is running"
        else
            error "Docker daemon is not running"
        fi
    else
        error "Docker is not installed"
    fi
    
    check
    if command -v docker-compose &> /dev/null; then
        local compose_version=$(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)
        success "Docker Compose installed: $compose_version"
    else
        error "Docker Compose is not installed"
    fi
}

check_environment_file() {
    log "Checking environment configuration..."
    check
    
    if [[ -f "$ENV_FILE" ]]; then
        success "Environment file exists: $ENV_FILE"
        
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
            check
            if [[ -n "${!var:-}" ]]; then
                success "Required variable set: $var"
            else
                error "Required variable missing: $var"
            fi
        done
        
        # Check secret strength
        check
        if [[ ${#SECRET_KEY} -gt 32 ]]; then
            success "SECRET_KEY length is adequate"
        else
            warn "SECRET_KEY should be longer than 32 characters"
        fi
        
        check
        if [[ ${#REDIS_PASSWORD} -gt 16 ]]; then
            success "REDIS_PASSWORD length is adequate"
        else
            warn "REDIS_PASSWORD should be longer than 16 characters"
        fi
    else
        error "Environment file not found: $ENV_FILE"
    fi
}

check_directories() {
    log "Checking directory structure..."
    
    # Load environment if available
    if [[ -f "$ENV_FILE" ]]; then
        source "$ENV_FILE"
    fi
    
    local dirs=(
        "${DATA_PATH:-./data}"
        "${UPLOADS_PATH:-./uploads}"
        "${EXPORTS_PATH:-./exports}"
        "${RESULTS_PATH:-./results}"
        "${BACKUP_PATH:-./backups}"
    )
    
    for dir in "${dirs[@]}"; do
        check
        if [[ -d "$dir" ]]; then
            success "Directory exists: $dir"
            
            # Check permissions
            if [[ -w "$dir" ]]; then
                success "Directory is writable: $dir"
            else
                error "Directory is not writable: $dir"
            fi
        else
            warn "Directory does not exist (will be created): $dir"
        fi
    done
}

check_system_resources() {
    log "Checking system resources..."
    
    # Check memory
    check
    local memory_gb=$(free -g | awk 'NR==2{printf "%.1f", $2}')
    if (( $(echo "$memory_gb >= 4" | bc -l) )); then
        success "Memory: ${memory_gb}GB (adequate)"
    else
        warn "Memory: ${memory_gb}GB (minimum 4GB recommended)"
    fi
    
    # Check disk space
    check
    local disk_space=$(df -BG . | awk 'NR==2{print $4}' | sed 's/G//')
    if [[ $disk_space -gt 20 ]]; then
        success "Disk space: ${disk_space}GB (adequate)"
    else
        warn "Disk space: ${disk_space}GB (minimum 20GB recommended)"
    fi
    
    # Check CPU cores
    check
    local cpu_cores=$(nproc)
    if [[ $cpu_cores -ge 2 ]]; then
        success "CPU cores: $cpu_cores (adequate)"
    else
        warn "CPU cores: $cpu_cores (minimum 2 cores recommended)"
    fi
}

check_network() {
    log "Checking network connectivity..."
    
    # Check internet connectivity
    check
    if ping -c 1 8.8.8.8 &> /dev/null; then
        success "Internet connectivity available"
    else
        error "No internet connectivity"
    fi
    
    # Check DNS resolution
    check
    if nslookup google.com &> /dev/null; then
        success "DNS resolution working"
    else
        error "DNS resolution failed"
    fi
    
    # Check if ports are available
    local ports=(3000 8000 6379)
    for port in "${ports[@]}"; do
        check
        if ss -tuln | grep ":$port " &> /dev/null; then
            warn "Port $port is already in use"
        else
            success "Port $port is available"
        fi
    done
}

check_ssl_certificate() {
    log "Checking SSL configuration..."
    
    if [[ -f "$ENV_FILE" ]]; then
        source "$ENV_FILE"
        
        if [[ -n "${DOMAIN:-}" ]]; then
            check
            # Check if domain resolves
            if nslookup "$DOMAIN" &> /dev/null; then
                success "Domain resolves: $DOMAIN"
                
                # Check SSL certificate (if HTTPS is accessible)
                check
                if timeout 10 openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null &>/dev/null; then
                    success "SSL certificate is accessible"
                    
                    # Check certificate expiry
                    local cert_days=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2 | xargs -I {} date -d {} +%s)
                    local current_days=$(date +%s)
                    local days_until_expiry=$(( (cert_days - current_days) / 86400 ))
                    
                    if [[ $days_until_expiry -gt 30 ]]; then
                        success "SSL certificate expires in $days_until_expiry days"
                    else
                        warn "SSL certificate expires in $days_until_expiry days (renew soon)"
                    fi
                else
                    warn "SSL certificate not accessible (may not be configured yet)"
                fi
            else
                warn "Domain does not resolve: $DOMAIN"
            fi
        else
            warn "DOMAIN not configured in environment"
        fi
    fi
}

check_firewall() {
    log "Checking firewall configuration..."
    
    check
    if command -v ufw &> /dev/null; then
        local ufw_status=$(sudo ufw status | head -1)
        if echo "$ufw_status" | grep -q "active"; then
            success "UFW firewall is active"
            
            # Check if necessary ports are allowed
            local required_ports=(22 80 443)
            for port in "${required_ports[@]}"; do
                check
                if sudo ufw status | grep -q "$port"; then
                    success "Port $port is allowed through firewall"
                else
                    warn "Port $port is not explicitly allowed (may use other rules)"
                fi
            done
        else
            warn "UFW firewall is not active"
        fi
    else
        warn "UFW firewall not installed (check other firewall solutions)"
    fi
}

check_container_images() {
    log "Checking container image availability..."
    
    if [[ -f "$ENV_FILE" ]]; then
        source "$ENV_FILE"
        
        local images=(
            "node:18.19.1-alpine"
            "python:3.11.9-slim"
            "redis:7.2-alpine"
            "prom/prometheus:v2.48.0"
            "grafana/grafana:10.2.0"
        )
        
        for image in "${images[@]}"; do
            check
            if docker pull "$image" &> /dev/null; then
                success "Container image available: $image"
            else
                error "Cannot pull container image: $image"
            fi
        done
    fi
}

check_compose_configuration() {
    log "Checking Docker Compose configuration..."
    
    check
    if [[ -f "${PROJECT_ROOT}/docker-compose.prod.yml" ]]; then
        success "Production Docker Compose file exists"
        
        check
        if docker-compose -f "${PROJECT_ROOT}/docker-compose.prod.yml" config &> /dev/null; then
            success "Docker Compose configuration is valid"
        else
            error "Docker Compose configuration has errors"
        fi
    else
        error "Production Docker Compose file not found"
    fi
}

check_backup_configuration() {
    log "Checking backup configuration..."
    
    check
    if [[ -f "${PROJECT_ROOT}/scripts/database-backup.sh" ]]; then
        success "Database backup script exists"
        
        check
        if [[ -x "${PROJECT_ROOT}/scripts/database-backup.sh" ]]; then
            success "Database backup script is executable"
        else
            warn "Database backup script is not executable"
        fi
    else
        error "Database backup script not found"
    fi
    
    check
    if [[ -f "${PROJECT_ROOT}/scripts/deploy-production.sh" ]]; then
        success "Deployment script exists"
        
        check
        if [[ -x "${PROJECT_ROOT}/scripts/deploy-production.sh" ]]; then
            success "Deployment script is executable"
        else
            warn "Deployment script is not executable"
        fi
    else
        error "Deployment script not found"
    fi
}

print_summary() {
    echo ""
    echo "======================================"
    echo "Environment Validation Summary"
    echo "======================================"
    echo "Total checks: $CHECKS_TOTAL"
    echo -e "Passed: ${GREEN}$CHECKS_PASSED${NC}"
    echo -e "Failed: ${RED}$CHECKS_FAILED${NC}"
    echo -e "Warnings: ${YELLOW}$CHECKS_WARNINGS${NC}"
    echo ""
    
    if [[ $CHECKS_FAILED -eq 0 ]]; then
        if [[ $CHECKS_WARNINGS -eq 0 ]]; then
            echo -e "${GREEN}✅ Environment is ready for production deployment!${NC}"
        else
            echo -e "${YELLOW}⚠️  Environment is mostly ready, but please review warnings.${NC}"
        fi
    else
        echo -e "${RED}❌ Environment has critical issues that must be resolved.${NC}"
        echo ""
        echo "To fix issues:"
        echo "1. Install missing dependencies"
        echo "2. Configure environment variables"
        echo "3. Create required directories"
        echo "4. Fix permission issues"
        echo "5. Configure firewall and SSL"
        echo ""
        echo "See DEPLOYMENT_GUIDE.md for detailed instructions."
    fi
    
    echo ""
}

# Main validation function
main() {
    echo "ApexFit AI Environment Validation"
    echo "================================"
    echo ""
    
    check_docker
    check_environment_file
    check_directories
    check_system_resources
    check_network
    check_ssl_certificate
    check_firewall
    check_container_images
    check_compose_configuration
    check_backup_configuration
    
    print_summary
    
    # Exit with error code if there are failures
    if [[ $CHECKS_FAILED -gt 0 ]]; then
        exit 1
    fi
}

# Handle script arguments
case "${1:-validate}" in
    "validate")
        main
        ;;
    "quick")
        check_docker
        check_environment_file
        check_directories
        print_summary
        ;;
    "network")
        check_network
        check_ssl_certificate
        print_summary
        ;;
    "security")
        check_firewall
        check_ssl_certificate
        print_summary
        ;;
    *)
        echo "Usage: $0 [validate|quick|network|security]"
        echo ""
        echo "Commands:"
        echo "  validate  - Full environment validation (default)"
        echo "  quick     - Basic checks only"
        echo "  network   - Network and SSL checks"
        echo "  security  - Security-focused checks"
        exit 1
        ;;
esac