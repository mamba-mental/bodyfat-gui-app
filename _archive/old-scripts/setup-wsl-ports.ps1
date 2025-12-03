# PowerShell script to setup WSL port forwarding
# Run as Administrator

Write-Host "Setting up WSL port forwarding..." -ForegroundColor Green

# Get WSL IP
$wslIP = bash -c "hostname -I | awk '{print \$1}'"
$wslIP = $wslIP.Trim()

Write-Host "WSL IP detected: $wslIP" -ForegroundColor Yellow

# Remove existing port forwarding rules if they exist
Write-Host "Removing existing port forwarding rules..." -ForegroundColor Yellow
netsh interface portproxy delete v4tov4 listenport=3001 2>$null
netsh interface portproxy delete v4tov4 listenport=8080 2>$null

# Add new port forwarding rules
Write-Host "Adding port forwarding rules..." -ForegroundColor Yellow
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=$wslIP
netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=8080 connectaddress=$wslIP

# Show active rules
Write-Host "`nActive port forwarding rules:" -ForegroundColor Green
netsh interface portproxy show all

# Create firewall rules
Write-Host "`nCreating firewall rules..." -ForegroundColor Yellow
netsh advfirewall firewall delete rule name="WSL Development Port 3001" 2>$null
netsh advfirewall firewall delete rule name="WSL Development Port 8080" 2>$null
netsh advfirewall firewall add rule name="WSL Development Port 3001" dir=in action=allow protocol=TCP localport=3001
netsh advfirewall firewall add rule name="WSL Development Port 8080" dir=in action=allow protocol=TCP localport=8080

Write-Host "`nSetup complete!" -ForegroundColor Green
Write-Host "You should now be able to access:" -ForegroundColor Cyan
Write-Host "  - http://localhost:3001 (Next.js app)" -ForegroundColor White
Write-Host "  - http://localhost:8080 (Simple demo)" -ForegroundColor White

Write-Host "`nIf it still doesn't work, try:" -ForegroundColor Yellow
Write-Host "  - Restart Windows Terminal/PowerShell" -ForegroundColor White
Write-Host "  - Restart WSL: wsl --shutdown then wsl" -ForegroundColor White
Write-Host "  - Check Windows Defender Firewall settings" -ForegroundColor White