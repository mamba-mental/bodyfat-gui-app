# WSL2 Port Forwarding Fix
# Run this in PowerShell as Administrator

Write-Host "WSL2 Port Forwarding Setup" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

# Get WSL2 IP
$wsl2ip = bash.exe -c "hostname -I | awk '{print \$1}'"
Write-Host "WSL2 IP: $wsl2ip" -ForegroundColor Yellow

# Remove existing port proxy rules
Write-Host "`nRemoving existing port forwarding rules..." -ForegroundColor Cyan
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=* 2>$null
netsh interface portproxy delete v4tov4 listenport=3001 listenaddress=* 2>$null
netsh interface portproxy delete v4tov4 listenport=8000 listenaddress=* 2>$null

# Add new port forwarding rules
Write-Host "`nAdding port forwarding rules..." -ForegroundColor Cyan
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wsl2ip
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=$wsl2ip
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=$wsl2ip

# Show current rules
Write-Host "`nCurrent port forwarding rules:" -ForegroundColor Green
netsh interface portproxy show all

# Add firewall rules
Write-Host "`nAdding Windows Firewall rules..." -ForegroundColor Cyan
New-NetFirewallRule -DisplayName "WSL2 Next.js 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "WSL2 Next.js 3001" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "WSL2 Python API 8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -ErrorAction SilentlyContinue

Write-Host "`nDone! You should now be able to access:" -ForegroundColor Green
Write-Host "  - http://localhost:3001 (Next.js)" -ForegroundColor Yellow
Write-Host "  - http://localhost:8000 (Python API)" -ForegroundColor Yellow

Write-Host "`nIf it still doesn't work, try:" -ForegroundColor Cyan
Write-Host "  1. Restart WSL: wsl --shutdown" -ForegroundColor White
Write-Host "  2. Disable Windows Defender Firewall temporarily" -ForegroundColor White
Write-Host "  3. Use the WSL2 IP directly: http://${wsl2ip}:3001" -ForegroundColor White