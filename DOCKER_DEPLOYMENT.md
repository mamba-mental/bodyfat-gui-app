# Docker Deployment Guide for Ap³𝘹Fit.ai

This guide covers deploying Ap³𝘹Fit.ai using Docker with persistent data storage.

## Prerequisites

- Docker Engine 20.10+ 
- Docker Compose 2.0+
- 2GB free disk space minimum
- Port 7888 available (or modify docker-compose.yml)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/apexfit-ai.git
   cd apexfit-ai/bodyfat-gui-app
   ```

2. **Build and start the containers**
   ```bash
   docker-compose up -d --build
   ```

3. **Access the application**
   - Web UI: http://localhost:7888
   - Python API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Data Persistence

All user data is stored in Docker volumes that persist across container restarts:

- **apex-fit-data**: User profiles, entries, reports, and calculations
- **apex-fit-exports**: Generated PDF reports and data exports

### Volume Locations

By default, volumes are bound to local directories:
- `./nas-data`: Main application data
- `./nas-exports`: Export files

To use different locations, modify the `device` paths in docker-compose.yml:

```yaml
volumes:
  apex-fit-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /path/to/your/data  # Change this path
```

## Environment Variables

### Application Container (apex-fit-ai)

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Node environment | production |
| PORT | Application port | 3000 |
| DATA_DIR | Data storage path | /app/data |
| NEXT_PUBLIC_PYTHON_API_URL | Python API URL | http://python-api:8000 |

### Python API Container (python-api)

| Variable | Description | Default |
|----------|-------------|---------|
| PYTHONUNBUFFERED | Python output buffering | 1 |

## Backup and Restore

### Backing Up Data

1. **While containers are running:**
   ```bash
   docker exec apex-fit-ai-alpha tar -czf /tmp/backup.tar.gz /app/data
   docker cp apex-fit-ai-alpha:/tmp/backup.tar.gz ./backup-$(date +%Y%m%d).tar.gz
   ```

2. **Using volume backup:**
   ```bash
   docker run --rm -v apex-fit-data:/data -v $(pwd):/backup \
     alpine tar -czf /backup/data-backup-$(date +%Y%m%d).tar.gz -C /data .
   ```

### Restoring Data

1. **Stop containers:**
   ```bash
   docker-compose down
   ```

2. **Restore from backup:**
   ```bash
   docker run --rm -v apex-fit-data:/data -v $(pwd):/backup \
     alpine tar -xzf /backup/data-backup-20250707.tar.gz -C /data
   ```

3. **Restart containers:**
   ```bash
   docker-compose up -d
   ```

## Production Deployment

### Using Traefik (Recommended)

The docker-compose.yml includes Traefik labels for automatic SSL:

1. **Update domain:**
   ```yaml
   - "traefik.http.routers.apex-fit.rule=Host(`apexfit.yourdomain.com`)"
   ```

2. **Ensure Traefik is configured with Let's Encrypt**

### Using Nginx Proxy

Example nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name apexfit.yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:7888;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring

### Health Checks

Both containers have built-in health checks:

```bash
# Check container health
docker-compose ps

# View health check logs
docker inspect apex-fit-ai-alpha | grep -A 10 Health
```

### Logs

```bash
# View application logs
docker-compose logs -f apex-fit-ai

# View Python API logs
docker-compose logs -f python-api

# View last 100 lines
docker-compose logs --tail=100
```

## Troubleshooting

### Container won't start

1. Check logs: `docker-compose logs`
2. Verify ports are free: `netstat -tulpn | grep -E '7888|8000'`
3. Check volume permissions: `ls -la ./nas-data`

### Data not persisting

1. Verify volume is mounted: `docker exec apex-fit-ai-alpha ls -la /app/data`
2. Check volume exists: `docker volume ls`
3. Ensure DATA_DIR is set: `docker exec apex-fit-ai-alpha env | grep DATA_DIR`

### Python API connection issues

1. Check API health: `curl http://localhost:8000/health`
2. Verify network: `docker network ls`
3. Test internal connection: `docker exec apex-fit-ai-alpha curl http://python-api:8000/health`

## Updating

To update to the latest version:

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Remove old images
docker image prune -f
```

## Security Considerations

1. **API Keys**: Store sensitive API keys in environment files:
   ```bash
   # Create .env file
   echo "ANTHROPIC_API_KEY=your-key-here" > .env
   ```

2. **Network Isolation**: Consider creating a dedicated network:
   ```yaml
   networks:
     apexfit:
       driver: bridge
   ```

3. **Volume Encryption**: For sensitive data, use encrypted volumes:
   ```bash
   # Example with LUKS encryption
   cryptsetup luksFormat /dev/sdX
   cryptsetup open /dev/sdX apex-data
   ```

## Performance Optimization

1. **Resource Limits**: Add to docker-compose.yml:
   ```yaml
   services:
     apex-fit-ai:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
   ```

2. **Build Cache**: Use BuildKit for faster builds:
   ```bash
   DOCKER_BUILDKIT=1 docker-compose build
   ```

3. **Multi-stage Builds**: Already implemented in Dockerfile

## Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/apexfit-ai/issues
- Documentation: https://docs.apexfit.ai

---

*Last Updated: 2025-07-07*