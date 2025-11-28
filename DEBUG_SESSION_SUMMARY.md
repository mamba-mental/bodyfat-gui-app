# Body Fat GUI App Debug Session Summary
Date: July 3, 2025

## Project Information
- **Location**: `/mnt/c/GitHub_Projects/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app`
- **WSL IP**: 172.23.89.12
- **Next.js Port**: 3005
- **Python API Port**: 8000

## Issues Resolved

### 1. CORS Configuration Issues
**Problem**: App couldn't access local URLs due to CORS restrictions
**Solution**:
- Updated Python API CORS middleware to allow all localhost variations
- Added CORS headers to Next.js API routes
- Created `middleware.ts` for global CORS handling
- Updated `next.config.ts` with API rewrites and headers

**Files Modified**:
- `python-api/main.py` (lines 45-62)
- `src/app/api/data/route.ts` (added CORS headers)
- `src/app/api/calculate/route.ts` (added CORS headers)
- `middleware.ts` (new file)
- `next.config.ts` (added rewrites and headers)
- `.env.local` (added API configurations)

### 2. Next.js Rendering Error
**Problem**: "Bail out to client-side rendering: next/dynamic" error
**Solution**:
- Fixed dynamic import issue in `client-icon.tsx`
- Disabled Turbopack by modifying `package.json`
- Changed from `next dev --turbopack` to `next dev`

### 3. Server Startup Issues
**Problem**: Next.js server kept crashing
**Solution**:
- Started with `HOSTNAME=0.0.0.0 PORT=3005 npm run dev`
- Python API started with: `./venv/bin/uvicorn main:app --reload --host 127.0.0.1 --port 8000`

## Current Unresolved Issue

### Windows-to-WSL Network Access
**Problem**: Cannot access `http://localhost:3005` from Windows browser
**Symptoms**:
- ERR_CONNECTION_RESET or ERR_EMPTY_RESPONSE
- App works fine within WSL (curl succeeds)
- Direct WSL IP should work: http://172.23.89.12:3005

**Attempted Solutions**:
1. Created `fix-port-3005.bat` - Basic port forwarding script
2. Created `fix-wsl-ports.ps1` - PowerShell script with firewall rules
3. Created `fix-wsl-simple.bat` - Simplified batch script with hardcoded IP

**Port Forwarding Commands Used**:
```cmd
netsh interface portproxy add v4tov4 listenport=3005 listenaddress=0.0.0.0 connectport=3005 connectaddress=172.23.89.12
```

## How to Start the Servers

### Python API:
```bash
cd python-api
source venv/bin/activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Next.js:
```bash
cd /mnt/c/GitHub_Projects/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app
HOSTNAME=0.0.0.0 PORT=3005 npm run dev
```

## Access Methods
1. **From Windows (if port forwarding works)**: http://localhost:3005
2. **Direct WSL IP**: http://172.23.89.12:3005
3. **Python API**: http://172.23.89.12:8000

## Scripts Created
- `fix-port-3005.bat` - Windows batch file for port forwarding
- `fix-wsl-ports.ps1` - PowerShell script with comprehensive fixes
- `fix-wsl-simple.bat` - Simplified batch file with hardcoded IP
- `start-both-servers.sh` - Convenience script to start both servers

## Next Steps
1. Try accessing via direct WSL IP: http://172.23.89.12:3005
2. Consider moving project to WSL filesystem for better performance
3. Check if Windows Defender or antivirus is blocking connections
4. Try using Edge browser which sometimes handles WSL better