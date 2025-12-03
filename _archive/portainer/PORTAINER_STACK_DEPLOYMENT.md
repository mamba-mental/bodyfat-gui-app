# 🐳 Portainer Stack Deployment Guide

## Overview

This guide shows how to deploy the Apex Fit Body Fat Estimator as a Portainer stack, managing all containers together.

## Stack Contents

The stack includes three services:
- **Next.js Frontend** (port 7899)
- **Python API** (port 8013)  
- **Redis Database** (port 6380)

## Deployment Steps

### 1. Access Portainer

Navigate to your Portainer instance and select the **Inspiron** environment.

### 2. Create New Stack

1. Go to **Stacks** → **Add stack**
2. Choose **Web editor**
3. Name the stack: `apex-fit-dev`

### 3. Stack Configuration

Copy and paste the contents of `portainer-stack.yml` into the web editor:

```yaml
version: '3.8'

services:
  nextjs:
    image: node:18-alpine
    container_name: apex-fit-nextjs-dev
    working_dir: /app
    command: sh -c "npm install && npm run dev"
    ports:
      - "7899:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - DATA_DIR=/app/data
      - UPLOAD_DIR=/app/public/uploads
      - REDIS_URL=redis://redis:6379
      - NEXT_PUBLIC_PYTHON_API_URL=http://python-api:8000
    volumes:
      - /home/ubuntu/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app:/app
      - apex-fit-dev-data:/app/data
      - apex-fit-dev-uploads:/app/public/uploads
      - apex-fit-dev-exports:/app/exports
      - /app/node_modules
    restart: unless-stopped
    depends_on:
      - redis
      - python-api
    networks:
      - apex-fit-dev-network

  python-api:
    image: python:3.11-slim
    container_name: apex-fit-python-api-dev
    working_dir: /app
    command: sh -c "apt-get update && apt-get install -y gcc curl && pip install -r requirements.txt && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
    ports:
      - "8013:8000"
    environment:
      - PYTHONUNBUFFERED=1
      - DATA_DIR=/app/data
      - EXPORT_DIR=/app/exports
      - REDIS_URL=redis://redis:6379
    volumes:
      - /home/ubuntu/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app/python-api:/app
      - apex-fit-dev-data:/app/data
      - apex-fit-dev-exports:/app/exports
    restart: unless-stopped
    depends_on:
      - redis
    networks:
      - apex-fit-dev-network

  redis:
    image: redis:7-alpine
    container_name: apex-fit-redis-dev
    command: redis-server --save 60 1 --loglevel warning
    ports:
      - "6380:6379"
    volumes:
      - apex-fit-dev-redis:/data
    restart: unless-stopped
    networks:
      - apex-fit-dev-network

volumes:
  apex-fit-dev-data:
    driver: local
  apex-fit-dev-uploads:
    driver: local
  apex-fit-dev-exports:
    driver: local
  apex-fit-dev-redis:
    driver: local

networks:
  apex-fit-dev-network:
    driver: bridge
```

### 4. Deploy Stack

1. Click **Deploy the stack**
2. Wait for all containers to start

### 5. Verify Deployment

Check that all containers are running:
- In Portainer: Go to **Containers** and look for:
  - `apex-fit-nextjs-dev`
  - `apex-fit-python-api-dev`
  - `apex-fit-redis-dev`

### 6. Access the Application

Once deployed, access your application at:
- **Frontend**: `http://[INSPIRON_IP]:7899`
- **API**: `http://[INSPIRON_IP]:8013`
- **Redis**: `[INSPIRON_IP]:6380`

Replace `[INSPIRON_IP]` with your Inspiron machine's IP address.

## Stack Management

### View Stack Logs
1. Go to **Stacks** → Click on `apex-fit-dev`
2. Click **Logs** to see combined logs from all services

### Update Stack
1. Go to **Stacks** → Click on `apex-fit-dev`
2. Click **Editor** to modify the configuration
3. Click **Update the stack**

### Stop/Start Stack
- **Stop**: Click **Stop this stack**
- **Start**: Click **Start this stack**

### Remove Stack
1. Click **Delete this stack**
2. Choose whether to remove volumes (persistent data)

## Troubleshooting

### Containers Not Starting
- Check logs in Portainer for error messages
- Verify the bind mount paths exist on the host
- Ensure ports 7899, 8013, and 6380 are not in use

### Cannot Access Application
- Verify containers are running
- Check firewall rules on the Inspiron
- Test with container IP directly

### Path Issues
- Ensure the source code exists at:
  - `/home/ubuntu/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app`
  - `/home/ubuntu/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app/python-api`

## Benefits of Stack Management

1. **Single Management Point**: All containers managed together
2. **Easy Updates**: Update all services with one action
3. **Consistent State**: Services start/stop together
4. **Version Control**: Stack configuration can be versioned
5. **Environment Isolation**: Each stack has its own network
6. **Resource Management**: View combined resource usage

## Next Steps

1. Monitor container health in Portainer
2. Set up automated backups for Redis data
3. Configure alerts for container failures
4. Add health checks to services
5. Implement CI/CD pipeline for stack updates