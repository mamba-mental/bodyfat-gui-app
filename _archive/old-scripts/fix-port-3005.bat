@echo off
echo Fixing WSL2 Network Access for port 3005...

REM Get WSL IP
for /f "tokens=1" %%i in ('wsl hostname -I') do set WSL_IP=%%i
echo WSL IP: %WSL_IP%

REM Remove old port proxies
netsh interface portproxy delete v4tov4 listenport=3005 listenaddress=127.0.0.1 2>nul
netsh interface portproxy delete v4tov4 listenport=8000 listenaddress=127.0.0.1 2>nul

REM Add new port proxies
echo Setting up port forwarding for Next.js (3005)...
netsh interface portproxy add v4tov4 listenport=3005 listenaddress=127.0.0.1 connectport=3005 connectaddress=%WSL_IP%

echo Setting up port forwarding for Python API (8000)...
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=127.0.0.1 connectport=8000 connectaddress=%WSL_IP%

REM Open firewall
netsh advfirewall firewall add rule name="Next.js Dev 3005" dir=in action=allow protocol=TCP localport=3005 2>nul
netsh advfirewall firewall add rule name="Python API 8000" dir=in action=allow protocol=TCP localport=8000 2>nul

REM Show current port proxies
echo.
echo Current port proxies:
netsh interface portproxy show v4tov4

echo.
echo Done! Access your app at: http://localhost:3005
echo Python API at: http://localhost:8000
pause