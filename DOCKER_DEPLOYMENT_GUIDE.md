# Docker Deployment Guide for Ap³𝘹Fit.ai

This guide explains how to properly deploy the Body Fat Tracker application using Docker with persistent storage for images and data.

## Prerequisites

- Docker and Docker Compose installed
- Sufficient disk space for data and image storage
- Port 7888 (web app) and 8000 (API) available

## File Storage Implementation

The application now uses a proper file storage system instead of base64 strings in JSON:

- **Profile pictures**: Stored in `/app/public/uploads/profiles/`
- **Banner images**: Stored in `/app/public/uploads/banners/`
- **Data files**: Stored in `/app/data/`
- **Export files**: Stored in `/app/exports/`

## Quick Start

1. **Create necessary directories**:
   ```bash
   mkdir -p nas-data nas-uploads nas-exports
   ```

2. **Build and start the containers**:
   ```bash
   docker-compose up -d --build
   ```

3. **Access the application**:
   - Web App: http://localhost:7888
   - API: http://localhost:8000

## Docker Compose Configuration

The `docker-compose.yml` file is configured with:

- **Persistent volumes** for data, uploads, and exports
- **Health checks** for both services
- **Automatic restart** on failure
- **Network isolation** between services
- **Traefik labels** for reverse proxy (optional)

## Environment Variables

### Web Application
- `NODE_ENV`: Set to "production"
- `DATA_DIR`: Directory for JSON data storage
- `UPLOAD_DIR`: Directory for uploaded images
- `NEXT_PUBLIC_PYTHON_API_URL`: Internal API URL

### Python API
- `DATA_DIR`: Shared data directory
- `EXPORT_DIR`: Directory for exported reports

## Volume Management

The application uses three named volumes:

1. **apex-fit-data**: Stores user data and application state
2. **apex-fit-uploads**: Stores uploaded images
3. **apex-fit-exports**: Stores generated reports

### Backup Strategy

To backup your data:

```bash
# Backup all volumes
docker run --rm \
  -v apex-fit-data:/data \
  -v apex-fit-uploads:/uploads \
  -v apex-fit-exports:/exports \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/apex-fit-backup-$(date +%Y%m%d).tar.gz /data /uploads /exports
```

### Restore from Backup

```bash
# Restore all volumes
docker run --rm \
  -v apex-fit-data:/data \
  -v apex-fit-uploads:/uploads \
  -v apex-fit-exports:/exports \
  -v $(pwd)/backup:/backup \
  alpine tar xzf /backup/apex-fit-backup-YYYYMMDD.tar.gz -C /
```

## Production Considerations

### 1. Security
- Change default ports in production
- Use HTTPS with proper SSL certificates
- Implement rate limiting for upload endpoints
- Add authentication if publicly exposed

### 2. Performance
- Consider using a CDN for serving uploaded images
- Implement image optimization (resize, compress)
- Use Redis for caching frequently accessed data

### 3. Monitoring
- Set up logging aggregation (e.g., ELK stack)
- Monitor disk usage for uploads directory
- Set up alerts for health check failures

### 4. Scaling
- Use external object storage (S3, MinIO) for images
- Implement horizontal scaling with load balancer
- Use managed database instead of JSON files

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs -f apex-fit-ai
docker-compose logs -f python-api
```

### Permission issues
```bash
# Fix permissions on volumes
docker-compose down
sudo chown -R 1001:1001 nas-data nas-uploads nas-exports
docker-compose up -d
```

### Disk space issues
```bash
# Check volume sizes
docker system df
du -sh nas-uploads/
```

### Clean old images
```bash
# Remove unused images older than 30 days
find nas-uploads -type f -mtime +30 -delete
```

## Migration from Base64 Storage

If you have existing data with base64 images:

1. The application will automatically handle both formats
2. New uploads will use file storage
3. Old base64 images will continue to work
4. Consider running a migration script to convert existing images

## Development vs Production

### Development
```bash
# Use local directories
docker-compose -f docker-compose.dev.yml up
```

### Production
```bash
# Use named volumes with proper backup
docker-compose -f docker-compose.yml up -d
```

## Updates and Maintenance

To update the application:

```bash
# Pull latest changes
git pull

# Rebuild containers
docker-compose build --no-cache

# Restart with new version
docker-compose up -d

# Check health
docker-compose ps
```

## Support

For issues or questions:
- Check container logs: `docker-compose logs`
- Verify volume mounts: `docker inspect apex-fit-ai`
- Ensure ports are available: `netstat -tulpn | grep -E '7888|8000'`