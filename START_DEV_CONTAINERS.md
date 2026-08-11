# 🚀 Development Container Status & Access

> **Historical container-status snapshot.** Container names/ports below are not proof of current state. For August 2026, use [`CURRENT_STATUS.md`](CURRENT_STATUS.md) and verify listeners/process ownership live.

## Current Container Status

### ✅ Running Containers:

1. **Redis Container** (`fervent_galois`)
   - Port: **6380** (host) → 6379 (container)
   - Status: Running
   - Network: apex-fit-dev-network
   
2. **Python API Container** (`competent_cray`)
   - Port: **8013** (host) → 8000 (container)
   - Status: Running
   - Network: apex-fit-dev-network
   - Path: /home/ubuntu/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app/python-api

3. **Next.js Container** - Needs to be created

## Quick Start Commands

### Create and Start Next.js Container:

```bash
# From the Inspiron host machine
docker run -d \
  --name apex-fit-nextjs-dev \
  --network apex-fit-dev-network \
  -p 7899:3000 \
  -v /home/ubuntu/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app:/app \
  -w /app \
  -e NODE_ENV=development \
  -e REDIS_URL=redis://fervent_galois:6379 \
  -e NEXT_PUBLIC_PYTHON_API_URL=http://competent_cray:8000 \
  node:18-alpine \
  sh -c "npm install && npm run dev"
```

### Alternative: Use Docker Compose

```bash
# Navigate to project directory
cd /home/ubuntu/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app

# Start all services
docker-compose -f docker-compose.dev.yml up -d
```

## Access Points

Once all containers are running:

- **Frontend**: http://[INSPIRON_IP]:7899
- **Python API**: http://[INSPIRON_IP]:8013
- **Redis**: [INSPIRON_IP]:6380

Replace [INSPIRON_IP] with your actual Inspiron machine IP address.

## Check Container Status

```bash
# Check all running containers
docker ps

# Check specific containers
docker ps | grep -E "fervent_galois|competent_cray|apex-fit"

# View logs
docker logs fervent_galois        # Redis logs
docker logs competent_cray        # Python API logs
docker logs apex-fit-nextjs-dev   # Next.js logs (once created)
```

## Troubleshooting

### If containers aren't accessible:

1. Check firewall rules on the Inspiron:
```bash
sudo ufw status
sudo ufw allow 7899/tcp
sudo ufw allow 8013/tcp
sudo ufw allow 6380/tcp
```

2. Check Docker network:
```bash
docker network inspect apex-fit-dev-network
```

3. Test connectivity between containers:
```bash
# Test Redis from Python container
docker exec competent_cray redis-cli -h fervent_galois ping
```

### Container Names vs IDs

The containers were created with custom names but Docker assigned random names:
- Redis: Created as `apex-fit-redis-dev` → Running as `fervent_galois`
- Python API: Created as `apex-fit-python-api-dev` → Running as `competent_cray`

You can reference them by either their container ID or the assigned name.
