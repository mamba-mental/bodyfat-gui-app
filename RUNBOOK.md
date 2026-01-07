# ApexFit AI - Production Runbook

## 🎯 Overview

This runbook provides step-by-step operational procedures for managing ApexFit AI in production. It includes deployment, monitoring, troubleshooting, and emergency response procedures.

## 📞 Emergency Contacts

| Role | Primary | Secondary |
|------|---------|-----------|
| **On-Call Engineer** | [Your primary contact] | [Your secondary contact] |
| **Infrastructure** | [Infrastructure team] | [Backup contact] |
| **Security** | [Security team] | [Security backup] |
| **Business Owner** | [Product owner] | [Business stakeholder] |

## 🚀 Deployment Procedures

### Standard Deployment

```bash
# 1. Pre-deployment checks
./scripts/deploy-production.sh verify
curl -f http://localhost:3000/api/health

# 2. Create backup
./scripts/deploy-production.sh backup

# 3. Deploy new version
git pull origin main
./scripts/deploy-production.sh deploy

# 4. Post-deployment verification
curl -f http://localhost:3000/api/health
curl -f http://localhost:8000/health
docker-compose -f docker-compose.prod.yml ps
```

### Hotfix Deployment

```bash
# 1. Urgent backup
./scripts/database-backup.sh backup

# 2. Quick deployment
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 3. Immediate verification
curl -f http://localhost:3000/api/health
```

### Rollback Procedure

```bash
# 1. Immediate rollback
./scripts/deploy-production.sh rollback

# 2. Verify rollback
curl -f http://localhost:3000/api/health
docker-compose -f docker-compose.prod.yml ps

# 3. Post-rollback communication
# Notify stakeholders about rollback and issue
```

## 🔍 Monitoring & Alerting

### Key Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold | Response |
|--------|------------------|-------------------|----------|
| **Service Uptime** | < 99.5% | < 99% | Investigate immediately |
| **Response Time (95th)** | > 2s | > 5s | Check performance |
| **Error Rate** | > 1% | > 5% | Investigate errors |
| **CPU Usage** | > 70% | > 90% | Scale resources |
| **Memory Usage** | > 80% | > 95% | Check for leaks |
| **Disk Space** | < 20% free | < 10% free | Clean up or expand |

### Monitoring Dashboards

- **Grafana**: http://localhost:3001
  - Username: admin
  - Password: [from GRAFANA_PASSWORD]
- **Prometheus**: http://localhost:9090

### Alert Response Procedures

#### Service Down Alert
```bash
# 1. Check service status
docker-compose -f docker-compose.prod.yml ps

# 2. Check logs
docker-compose -f docker-compose.prod.yml logs --tail=50 <service>

# 3. Restart if needed
docker-compose -f docker-compose.prod.yml restart <service>

# 4. Verify recovery
curl -f http://localhost:3000/api/health
```

#### High Error Rate Alert
```bash
# 1. Check error logs
docker-compose -f docker-compose.prod.yml logs --tail=100 | grep ERROR

# 2. Check specific service logs
docker-compose -f docker-compose.prod.yml logs backend | grep ERROR

# 3. Analyze error patterns
# Look for common error messages or patterns

# 4. Apply fix or escalate
```

#### Resource Usage Alert
```bash
# 1. Check resource usage
docker stats

# 2. Identify heavy consumers
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# 3. Restart if memory leak suspected
docker-compose -f docker-compose.prod.yml restart <service>

# 4. Scale if needed
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

## 🔧 Troubleshooting Guide

### Common Issues

#### Frontend Not Loading
```bash
# Check frontend service
docker-compose -f docker-compose.prod.yml logs frontend

# Check nginx/proxy logs (if using)
sudo tail -f /var/log/nginx/error.log

# Verify DNS resolution
nslookup your-domain.com

# Check SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

#### API Connection Issues
```bash
# Check backend health
curl -f http://localhost:8000/health

# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Verify network connectivity
docker network ls
docker network inspect bodyfat-gui-app_apexfit-network
```

#### Database Issues
```bash
# Check database file
ls -la /opt/apexfit/data/bodyfat.db

# Verify database integrity
./scripts/database-backup.sh verify

# Check database permissions
chmod 644 /opt/apexfit/data/bodyfat.db

# Restore from backup if corrupted
./scripts/database-backup.sh restore /path/to/latest/backup.db.gz
```

#### SSL Certificate Issues
```bash
# Check certificate expiry
openssl x509 -in /path/to/cert.pem -text -noout | grep "Not After"

# Test SSL connection
openssl s_client -connect your-domain.com:443

# Renew certificate (Let's Encrypt)
certbot renew --dry-run
```

## 💾 Backup & Recovery

### Daily Backup Verification
```bash
# Check if backup completed
ls -la /opt/apexfit/backups/ | head -10

# Verify latest backup integrity
./scripts/database-backup.sh verify

# Test backup restore (in staging)
./scripts/database-backup.sh restore /path/to/backup.db.gz
```

### Recovery Procedures

#### Database Recovery
```bash
# 1. Stop services
docker-compose -f docker-compose.prod.yml down

# 2. Backup current (corrupted) database
cp /opt/apexfit/data/bodyfat.db /opt/apexfit/data/bodyfat.db.corrupted

# 3. Restore from backup
./scripts/database-backup.sh restore /path/to/good/backup.db.gz

# 4. Start services
docker-compose -f docker-compose.prod.yml up -d

# 5. Verify recovery
curl -f http://localhost:3000/api/health
```

#### Full System Recovery
```bash
# 1. Stop all services
docker-compose -f docker-compose.prod.yml down

# 2. Restore data directories
tar -xzf /path/to/system/backup.tar.gz -C /

# 3. Fix permissions
sudo chown -R $USER:$USER /opt/apexfit
chmod -R 755 /opt/apexfit

# 4. Start services
docker-compose -f docker-compose.prod.yml up -d

# 5. Verify all services
./scripts/deploy-production.sh verify
```

## 🔄 Maintenance Procedures

### Weekly Maintenance
```bash
# 1. Check disk usage
df -h
du -sh /opt/apexfit/*

# 2. Clean old logs
docker system prune -f
docker volume prune -f

# 3. Update system packages
sudo apt update && sudo apt upgrade -y

# 4. Verify backup integrity
./scripts/database-backup.sh verify

# 5. Review monitoring dashboards
# Check Grafana for any anomalies
```

### Monthly Maintenance
```bash
# 1. Update container images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 2. Database optimization
sqlite3 /opt/apexfit/data/bodyfat.db "VACUUM; ANALYZE;"

# 3. Security updates
sudo apt update && sudo apt upgrade -y
docker scout cves

# 4. Certificate renewal check
certbot certificates

# 5. Performance review
# Analyze metrics for optimization opportunities
```

### Quarterly Maintenance
```bash
# 1. Full security audit
docker scout cves
trivy image <image-name>

# 2. Capacity planning review
# Analyze growth trends and plan scaling

# 3. Disaster recovery test
# Perform full restore test in staging

# 4. Documentation update
# Update runbook with lessons learned

# 5. Team training update
# Ensure team is up-to-date on procedures
```

## 🚨 Incident Response

### Severity Levels

#### P1 - Critical (15 min response)
- Complete service outage
- Data loss/corruption
- Security breach

#### P2 - High (1 hour response)
- Partial service degradation
- Performance issues affecting users
- Failed deployments

#### P3 - Medium (4 hour response)
- Minor functionality issues
- Monitoring alerts
- Non-critical bugs

#### P4 - Low (Next business day)
- Feature requests
- Documentation updates
- Minor optimizations

### Incident Response Process

#### Initial Response (5 minutes)
```bash
# 1. Acknowledge alert
# Update monitoring system

# 2. Quick assessment
curl -f http://localhost:3000/api/health
docker-compose -f docker-compose.prod.yml ps

# 3. Initial communication
# Notify team of incident

# 4. Begin investigation
docker-compose -f docker-compose.prod.yml logs --tail=100
```

#### Investigation (15 minutes)
```bash
# 1. Gather information
docker stats
df -h
tail -100 /var/log/apexfit-*.log

# 2. Identify root cause
# Analyze logs and metrics

# 3. Determine fix approach
# Restart, rollback, or code fix

# 4. Update stakeholders
# Provide status update
```

#### Resolution
```bash
# 1. Apply fix
# Based on investigation findings

# 2. Verify resolution
curl -f http://localhost:3000/api/health
curl -f http://localhost:8000/health

# 3. Monitor for stability
# Watch metrics for 30 minutes

# 4. Post-incident communication
# Notify resolution to stakeholders
```

## 📊 Performance Optimization

### Performance Monitoring
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/

# Monitor resource usage
docker stats --no-stream

# Database performance
sqlite3 /opt/apexfit/data/bodyfat.db ".timer on" "SELECT COUNT(*) FROM entries;"

# Check cache hit rates
redis-cli info stats | grep hit_rate
```

### Optimization Actions

#### High CPU Usage
```bash
# Scale backend workers
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Optimize database queries
# Analyze slow queries and add indexes

# Enable caching
# Verify Redis is working properly
```

#### High Memory Usage
```bash
# Restart services to clear memory leaks
docker-compose -f docker-compose.prod.yml restart

# Analyze memory usage patterns
docker stats --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Adjust memory limits if needed
# Update docker-compose.prod.yml
```

#### Slow Response Times
```bash
# Check database performance
./scripts/database-backup.sh verify

# Optimize database
sqlite3 /opt/apexfit/data/bodyfat.db "VACUUM; ANALYZE;"

# Check network latency
ping your-domain.com

# Enable compression
# Verify nginx/proxy gzip settings
```

## 🔐 Security Procedures

### Security Monitoring
```bash
# Check for failed login attempts
grep "Failed" /var/log/auth.log

# Monitor container vulnerabilities
docker scout cves

# Check SSL certificate status
openssl x509 -in /path/to/cert.pem -text -noout | grep "Not After"

# Verify firewall rules
sudo ufw status
```

### Security Incident Response
```bash
# 1. Isolate affected systems
# Block suspicious IPs
sudo ufw deny from <suspicious-ip>

# 2. Gather evidence
# Copy relevant logs before rotation

# 3. Assess impact
# Check for data access or modification

# 4. Contain and remediate
# Update credentials, patch vulnerabilities

# 5. Recovery
# Restore from clean backups if needed
```

## 📋 Checklists

### Pre-Deployment Checklist
- [ ] Backup completed successfully
- [ ] Staging environment tested
- [ ] Team notification sent
- [ ] Rollback plan confirmed

### Post-Deployment Checklist
- [ ] Health checks passing
- [ ] Monitoring alerts cleared
- [ ] Performance metrics normal
- [ ] User acceptance confirmed

### Incident Response Checklist
- [ ] Incident acknowledged
- [ ] Stakeholders notified
- [ ] Root cause identified
- [ ] Fix applied and tested
- [ ] Post-mortem scheduled

---

## 📚 Quick Reference

### Essential Commands
```bash
# Service status
docker-compose -f docker-compose.prod.yml ps

# Service logs
docker-compose -f docker-compose.prod.yml logs <service>

# Health checks
curl -f http://localhost:3000/api/health
curl -f http://localhost:8000/health

# Restart service
docker-compose -f docker-compose.prod.yml restart <service>

# Full restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Backup database
./scripts/database-backup.sh backup

# Deploy
./scripts/deploy-production.sh deploy

# Rollback
./scripts/deploy-production.sh rollback
```

### Important File Locations
- **Environment**: `.env.production`
- **Logs**: `/var/log/apexfit-*.log`
- **Data**: `/opt/apexfit/data/`
- **Backups**: `/opt/apexfit/backups/`
- **Scripts**: `./scripts/`

---

**Last Updated**: [Update date]
**Version**: 1.0
**Maintained By**: [Your team]