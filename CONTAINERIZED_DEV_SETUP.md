# 🐳 Containerized Development Setup with Redis Persistence

> **Historical container setup.** The verified August 11, 2026 daily-use topology runs Next.js on Windows `:3010`, FastAPI on Windows `:8313`, and only optional Redis in WSL/Docker on `:6385`. Validate this document's Compose file, ports, and mounts before use. See [`RUNBOOK.md`](RUNBOOK.md).

## Overview

This setup provides a fully containerized development environment with:
- ✅ Hot-reload for both Next.js and Python API
- ✅ Redis for persistent data storage (replacing localStorage)
- ✅ Non-standard ports to avoid conflicts
- ✅ Volume mounts for live code updates
- ✅ Network isolation between services

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   Python API    │────▶│     Redis       │
│   Port: 7899    │     │   Port: 8013    │     │   Port: 6380    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Quick Start

### Using Docker Compose

1. Navigate to the project directory:
```bash
cd /path/to/bodyfat-gui-app
```

2. Start the development stack:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

3. Access the application:
- Frontend: http://localhost:7899
- Python API: http://localhost:8013
- Redis: localhost:6380

### Using Portainer

The containers have been deployed individually in Portainer with:
- Container names: `apex-fit-dev`, `apex-fit-python-api-dev`, `apex-fit-redis-dev`
- Network: `apex-fit-dev-network`
- Bind mounts configured for source code hot-reload

## Data Persistence

### Redis Storage Structure

Data is now stored in Redis instead of browser localStorage:

```
user:<userId>                    # User profile data
entry:<userId>:<entryId>         # Individual body fat entries
user:<userId>:entries            # Set of entry IDs
user:<userId>:entries:sorted     # Sorted set of entries by date
report:<userId>:<reportId>       # Generated reports
user:<userId>:reports            # Set of report IDs
user:<userId>:reports:sorted     # Sorted set of reports by date
user:<userId>:lastCalculation    # Last PRIME calculation
```

### API Endpoints

New Redis-backed API endpoints:

- `GET/POST /api/redis/user` - User profile management
- `GET/POST/DELETE /api/redis/entries` - Body fat entries
- `GET/POST /api/redis/reports` - Generated reports
- `GET/POST /api/redis/calculation` - Last calculation
- `GET/POST /api/redis/export` - Export/import all data

### Migration from localStorage

To migrate existing localStorage data to Redis:

1. Export data from the browser:
   - Go to Settings → Data Management
   - Click "Export All Data"
   - Save the JSON file

2. Import to Redis:
   - Use the `/api/redis/export` POST endpoint
   - Or implement a migration script using the import function

## Development Features

### Hot Reload

- **Next.js**: Changes to React components, pages, and styles reload instantly
- **Python API**: FastAPI with `--reload` flag restarts on code changes
- **Source Code**: Mounted as volumes, so changes on host are reflected in containers

### Non-Standard Ports

To avoid conflicts with other services:
- Next.js: 7899 (instead of 3000)
- Python API: 8013 (instead of 8000)
- Redis: 6380 (instead of 6379)

### Environment Variables

Key environment variables set in containers:

```bash
# Next.js
NODE_ENV=development
REDIS_URL=redis://redis-dev:6379
NEXT_PUBLIC_PYTHON_API_URL=http://python-api-dev:8000

# Python API
REDIS_URL=redis://redis-dev:6379
DATA_DIR=/app/data
EXPORT_DIR=/app/exports
```

## Troubleshooting

### Container Won't Start

Check logs:
```bash
docker logs apex-fit-dev
docker logs apex-fit-python-api-dev
docker logs apex-fit-redis-dev
```

### Path Issues

If you see "file not found" errors:
1. Ensure the bind mount paths are correct for your environment
2. Check that source files exist in the mounted directories
3. Verify permissions on the host directories

### Port Conflicts

If ports are already in use:
1. Check running containers: `docker ps`
2. Modify ports in docker-compose.dev.yml
3. Update environment variables accordingly

### Redis Connection Issues

1. Ensure Redis container is running
2. Check network connectivity between containers
3. Verify REDIS_URL environment variable

## Data Backup

### Export from Redis
```bash
# Connect to Redis
docker exec -it apex-fit-redis-dev redis-cli

# Export all data
BGSAVE

# Copy dump file
docker cp apex-fit-redis-dev:/data/dump.rdb ./redis-backup.rdb
```

### Restore to Redis
```bash
# Copy dump file to container
docker cp ./redis-backup.rdb apex-fit-redis-dev:/data/dump.rdb

# Restart Redis
docker restart apex-fit-redis-dev
```

## Next Steps

1. Update the frontend to use Redis API endpoints instead of localStorage
2. Implement user authentication for multi-user support
3. Add data migration utilities
4. Set up automated backups
5. Configure SSL/TLS for production
