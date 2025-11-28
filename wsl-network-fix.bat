@echo off
echo Fixing WSL2 Network Access...

REM Get WSL IP
for /f "tokens=3" %%i in ('wsl hostname -I') do set WSL_IP=%%i
echo WSL IP: %WSL_IP%

REM Remove old port proxy
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=127.0.0.1

REM Add new port proxy
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=127.0.0.1 connectport=3000 connectaddress=%WSL_IP%

REM Open firewall
netsh advfirewall firewall add rule name="Next.js Dev" dir=in action=allow protocol=TCP localport=3000

echo.
echo Done! Try: http://localhost:3000
pause