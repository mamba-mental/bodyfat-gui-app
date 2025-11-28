# ApexFit AI - Production Deployment Guide

This guide provides comprehensive instructions for deploying ApexFit AI to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Production Deployment](#production-deployment)
4. [Monitoring & Logging](#monitoring--logging)
5. [Backup & Recovery](#backup--recovery)
6. [Security Considerations](#security-considerations)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended)
- **CPU**: 2+ cores (4+ recommended)
- **Memory**: 4GB+ RAM (8GB+ recommended)
- **Storage**: 20GB+ available space
- **Network**: Internet connectivity for image pulls

### Software Dependencies

- Docker 24.0+ and Docker Compose 2.20+
- Git for repository management
- curl and wget for health checks
- Optional: nginx/traefik for reverse proxy

### Installation Commands

```bash
# Install Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

## Environment Setup

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd bodyfat-gui-app
```

### 2. Configure Environment

```bash
# Copy and edit production environment
cp .env.production.example .env.production
nano .env.production
```

### Required Environment Variables

```bash
# Domain and SSL
DOMAIN=apexfit.yourdomain.com
ENABLE_SSL=true
SSL_EMAIL=admin@yourdomain.com

# Security (GENERATE STRONG SECRETS!)
SECRET_KEY=your-super-secret-key-change-this-in-production
REDIS_PASSWORD=your-redis-password-change-this
GRAFANA_PASSWORD=your-grafana-admin-password

# Storage paths (ensure these exist and are writable)
DATA_PATH=/opt/apexfit/data
UPLOADS_PATH=/opt/apexfit/uploads
EXPORTS_PATH=/opt/apexfit/exports
RESULTS_PATH=/opt/apexfit/results
BACKUP_PATH=/opt/apexfit/backups

# Performance
BACKEND_WORKERS=4
LOG_LEVEL=info
```

### 3. Create Directory Structure

```bash
sudo mkdir -p /opt/apexfit/{data,uploads,exports,results,backups}
sudo chown -R $USER:$USER /opt/apexfit
chmod -R 755 /opt/apexfit
```

## Production Deployment

### Method 1: Automated Deployment (Recommended)

```bash
# Make deployment script executable
chmod +x scripts/deploy-production.sh

# Run deployment
./scripts/deploy-production.sh deploy
```

### Method 2: Manual Deployment

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Start services
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
```

### Deployment Verification

```bash
# Check service health
curl -f http://localhost:3000/api/health
curl -f http://localhost:8000/health

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check resource usage
docker stats
```

## Monitoring & Logging

### Enable Monitoring Stack

```bash
# Start with monitoring services
docker-compose -f docker-compose.prod.yml --profile monitoring up -d
```

### Access Monitoring Dashboards

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
  - Username: admin
  - Password: (from GRAFANA_PASSWORD)

### Log Management

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f backend

# Application log files
tail -f /var/log/apexfit-deploy.log
tail -f /var/log/apexfit-db.log
```

### Log Rotation

Logs are automatically rotated with:
- Max size: 10MB per file
- Max files: 3 per service
- Format: JSON with timestamps

## Backup & Recovery

### Database Backup

```bash
# Create backup
./scripts/database-backup.sh backup

# List backups
./scripts/database-backup.sh list

# Restore from backup
./scripts/database-backup.sh restore /path/to/backup.db.gz
```

### Automated Backups

Add to crontab for automated backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/bodyfat-gui-app/scripts/database-backup.sh backup
```

### Full System Backup

```bash
# Backup with deployment script
./scripts/deploy-production.sh backup

# Manual backup
tar -czf apexfit-backup-$(date +%Y%m%d).tar.gz \
  /opt/apexfit/data \
  /opt/apexfit/uploads \
  /opt/apexfit/exports \
  .env.production
```

### Disaster Recovery

```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Restore data
tar -xzf apexfit-backup-YYYYMMDD.tar.gz -C /

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

## Security Considerations

### SSL/TLS Configuration

For production deployment with SSL:

1. **Using Traefik** (recommended):
   ```yaml
   # Add to docker-compose.prod.yml
   labels:
     - "traefik.enable=true"
     - "traefik.http.routers.apexfit.rule=Host(`${DOMAIN}`)"
     - "traefik.http.routers.apexfit.tls=true"
     - "traefik.http.routers.apexfit.tls.certresolver=letsencrypt"
   ```

2. **Using nginx**:
   ```nginx
   server {
       listen 443 ssl;
       server_name apexfit.yourdomain.com;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### Container Security

- All containers run as non-root users
- Security scanning via Trivy in CI/CD
- Regular image updates
- Secrets managed via environment variables
- Network isolation between services

### Database Security

- SQLite file permissions: 600
- Regular integrity checks
- Encrypted backups (optional)
- Access logging

## Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check container logs
docker-compose -f docker-compose.prod.yml logs <service>

# Check resource usage
docker stats

# Verify environment
docker-compose -f docker-compose.prod.yml config
```

#### Database Connection Issues

```bash
# Verify database exists and is readable
ls -la /opt/apexfit/data/bodyfat.db

# Check database integrity
./scripts/database-backup.sh verify

# Reset database permissions
chmod 644 /opt/apexfit/data/bodyfat.db
```

#### High Memory Usage

```bash
# Check memory usage by service
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

#### SSL Certificate Issues

```bash
# Check certificate expiry
openssl x509 -in /path/to/cert.pem -text -noout | grep "Not After"

# Renew Let's Encrypt certificate (if using Traefik)
docker-compose -f docker-compose.prod.yml restart traefik
```

### Health Check Endpoints

- **Frontend Health**: `/api/health`
- **Backend Health**: `/health`
- **Prometheus Metrics**: `/metrics`

### Debug Mode

Enable debug logging:

```bash
# Set debug environment
echo "LOG_LEVEL=debug" >> .env.production

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

## Maintenance

### Regular Tasks

#### Daily
- Monitor service health
- Check log files for errors
- Verify backup completion

#### Weekly
- Review monitoring dashboards
- Check disk space usage
- Update security patches

#### Monthly
- Review and rotate logs
- Test backup/restore procedures
- Update container images
- Security audit

### Update Deployment

```bash
# Pull latest changes
git pull origin main

# Update containers
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Verify update
./scripts/deploy-production.sh verify
```

### Scaling

#### Horizontal Scaling
```bash
# Scale backend workers
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

#### Vertical Scaling
Update resource limits in docker-compose.prod.yml:
```yaml
deploy:
  resources:
    limits:
      memory: 4G
      cpus: '2.0'
```

### Performance Tuning

#### Database Optimization
```bash
# Run database optimization
sqlite3 /opt/apexfit/data/bodyfat.db "VACUUM; ANALYZE;"
```

#### Container Optimization
- Monitor resource usage with `docker stats`
- Adjust worker counts based on CPU cores
- Optimize memory limits based on usage patterns

### Rollback Procedures

#### Automatic Rollback
```bash
./scripts/deploy-production.sh rollback
```

#### Manual Rollback
```bash
# Stop current version
docker-compose -f docker-compose.prod.yml down

# Restore previous image tags
docker-compose -f docker-compose.prod.yml up -d

# Verify rollback
curl -f http://localhost:3000/api/health
```

## Support and Documentation

- **Logs**: `/var/log/apexfit-*.log`
- **Configuration**: `.env.production`
- **Health Checks**: `scripts/health-check.js`
- **Database Tools**: `scripts/database-backup.sh`
- **Deployment Tools**: `scripts/deploy-production.sh`

For additional support, check:
1. Application logs
2. Container logs
3. System monitoring dashboards
4. Health check endpoints

## Security Contacts

For security issues:
- Review security logs in monitoring dashboards
- Check container vulnerability scans
- Verify SSL certificate status
- Monitor access patterns