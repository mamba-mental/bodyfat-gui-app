# PowerShell script to set up port forwarding from WSL to Windows
# Run this script as Administrator in PowerShell

$wslIp = bash.exe -c "ip addr show eth0 | grep 'inet ' | awk '{print `$2}' | cut -d/ -f1"
$port = 3000

Write-Host "WSL IP Address: $wslIp"
Write-Host "Setting up port forwarding for port $port..."

# Remove existing port proxy
netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0

# Add new port proxy
netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wslIp

# Show current port proxies
Write-Host "`nCurrent port forwards:"
netsh interface portproxy show v4tov4

# Add firewall rule
Write-Host "`nAdding firewall rule..."
New-NetFirewallRule -DisplayName "WSL Next.js Dev Server" -Direction Inbound -LocalPort $port -Protocol TCP -Action Allow -ErrorAction SilentlyContinue

Write-Host "`nSetup complete! You should now be able to access http://localhost:$port from Windows."
Write-Host "If it doesn't work, make sure the Next.js dev server is running in WSL."