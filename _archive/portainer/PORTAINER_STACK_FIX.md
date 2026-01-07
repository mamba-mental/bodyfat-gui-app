# 🔧 Portainer Stack Fix - Volume Mount Issues

## Problem Identified

The stack containers couldn't find `package.json` and `requirements.txt` because the volume mounts were using `/home/ubuntu/` paths which don't exist in the Portainer/Docker context.

## Solution

Use the full WSL mount paths that are accessible from the Docker environment:

### Correct Paths:
- **Next.js**: `/mnt/wsl/docker-desktop-bind-mounts/Ubuntu/f33afce2d5ef1357613d735f835e4ac60a701766a776382e67cc34c9804dff13/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app`
- **Python API**: `/mnt/wsl/docker-desktop-bind-mounts/Ubuntu/f33afce2d5ef1357613d735f835e4ac60a701766a776382e67cc34c9804dff13/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app/python-api`

## Steps to Fix in Portainer

1. **Stop the Current Stack**:
   - Go to Stacks → `apex-fit-dev`
   - Click "Stop this stack"

2. **Update Stack Configuration**:
   - Click "Editor"
   - Replace the entire contents with the fixed configuration from `portainer-stack-fixed.yml`
   - Key changes:
     ```yaml
     # Old (incorrect):
     - /home/ubuntu/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app:/app
     
     # New (correct):
     - /mnt/wsl/docker-desktop-bind-mounts/Ubuntu/f33afce2d5ef1357613d735f835e4ac60a701766a776382e67cc34c9804dff13/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app:/app
     ```

3. **Update the Stack**:
   - Click "Update the stack"
   - Wait for all containers to restart

4. **Verify Containers are Running**:
   - Check container logs - should see:
     - Next.js: `ready - started server on 0.0.0.0:3000`
     - Python API: `Uvicorn running on http://0.0.0.0:8000`
     - Redis: `Ready to accept connections`

## Access URLs

Once the stack is running properly:
- **Frontend**: http://192.168.86.179:7899
- **API**: http://192.168.86.179:8013
- **Redis**: 192.168.86.179:6380

## Port Publishing

The ports should now show as published in Portainer:
- `7899/tcp` → Next.js
- `8013/tcp` → Python API  
- `6380/tcp` → Redis

## Testing

After updating the stack:

1. Test Next.js:
   ```bash
   curl http://192.168.86.179:7899
   ```

2. Test Python API:
   ```bash
   curl http://192.168.86.179:8013/health
   ```

3. Test Redis:
   ```bash
   redis-cli -h 192.168.86.179 -p 6380 ping
   ```

## Alternative: Direct Container Path

If the WSL mount paths don't work, you may need to:
1. Copy the project to a Docker-accessible location
2. Use Docker volumes instead of bind mounts
3. Or use a different mount strategy in Portainer