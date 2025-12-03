# WSL2 Networking Fix for Next.js Application

## Problem
When running Next.js in WSL2, the default behavior binds to localhost/127.0.0.1 which is not accessible from Windows browsers due to WSL2's NAT networking architecture.

## Solution Applied

### 1. Updated package.json
Modified the dev scripts to bind to all interfaces (0.0.0.0):
```json
"scripts": {
  "dev": "next dev -H 0.0.0.0",
  "dev:turbo": "next dev --turbopack -H 0.0.0.0",
  "start": "next start -H 0.0.0.0"
}
```

### 2. Created start-servers.sh Script
A convenient script to start both frontend and backend servers with proper configuration.

## How to Start the Application

### Option 1: Using the Start Script (Recommended)
```bash
cd /mnt/c/GitHub_Projects/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app
./start-servers.sh
```

### Option 2: Manual Start in Separate Terminals

Terminal 1 - Frontend:
```bash
cd /mnt/c/GitHub_Projects/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app
npm run dev
```

Terminal 2 - Backend:
```bash
cd /mnt/c/GitHub_Projects/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app
python3 api/main.py
```

## Access URLs

From Windows browser:
- Frontend: **http://localhost:3000**
- API: **http://localhost:8000**

## Troubleshooting

### If localhost still doesn't work:

1. **Check Windows Firewall**
   - Open Windows Defender Firewall
   - Click "Allow an app or feature"
   - Ensure Node.js is allowed

2. **Try alternative URLs**
   - http://127.0.0.1:3000
   - http://[::1]:3000 (IPv6)

3. **Check if ports are in use**
   ```bash
   netstat -an | grep -E "3000|8000"
   ```

4. **Reset WSL2 networking**
   In PowerShell (as Admin):
   ```powershell
   wsl --shutdown
   netsh int ip reset
   ```

5. **Port forwarding (if needed)**
   In PowerShell (as Admin):
   ```powershell
   netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=127.0.0.1
   ```

## Why This Works

WSL2 uses a virtualized network adapter with NAT. By binding to 0.0.0.0 instead of localhost, the Next.js server listens on all available network interfaces, making it accessible from the Windows host through WSL2's automatic port forwarding mechanism.