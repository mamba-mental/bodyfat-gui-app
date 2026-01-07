# WSL Networking Fix Guide

## Issue: localhost not accessible from Windows

This is a common WSL2 networking issue. Here are several solutions:

## Solution 1: Port Forwarding (PowerShell as Admin)

Run these commands in **Windows PowerShell as Administrator**:

```powershell
# Forward port 3001 from WSL to Windows
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=172.23.89.12

# Forward port 8080 from WSL to Windows  
netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=8080 connectaddress=172.23.89.12

# Check if forwarding is active
netsh interface portproxy show all
```

## Solution 2: Windows Firewall

1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Create new Inbound Rule:
   - Rule Type: Port
   - Protocol: TCP
   - Ports: 3001, 8080
   - Action: Allow
   - Profile: All
   - Name: "WSL Development Ports"

## Solution 3: WSL Configuration

Create/edit `.wslconfig` in your Windows user directory (`C:\Users\<username>\.wslconfig`):

```ini
[wsl2]
localhostForwarding=true
```

Then restart WSL:
```powershell
wsl --shutdown
wsl
```

## Solution 4: Use WSL IP directly

Get WSL IP from within WSL:
```bash
hostname -I
```

Then access from Windows: `http://<WSL_IP>:3001`

## Solution 5: Alternative - Use Windows Terminal

1. Install Windows Terminal
2. Use `wsl -d <distro> -e bash -c "cd /path/to/project && npm run dev"`
3. This may provide better networking integration

## Testing Steps

1. From WSL, verify server is running:
   ```bash
   curl -I http://localhost:3001
   ```

2. From Windows CMD/PowerShell:
   ```cmd
   telnet localhost 3001
   ```

3. Check Windows processes listening on port:
   ```cmd
   netstat -an | findstr :3001
   ```

## Current Status

- WSL IP: 172.23.89.12
- Ports: 3001 (Next.js), 8080 (Simple server)
- Both servers confirmed running and responding from within WSL