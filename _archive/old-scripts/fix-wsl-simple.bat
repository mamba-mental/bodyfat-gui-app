@echo off
echo Fixing WSL2 Network Access...

REM Hardcode the WSL IP for now
set WSL_IP=172.23.89.12
echo Using WSL IP: %WSL_IP%

REM Remove ALL port proxies first
echo.
echo Removing all port proxies...
netsh interface portproxy reset

REM Add new port proxies
echo.
echo Adding port forwarding rules...
netsh interface portproxy add v4tov4 listenport=3005 listenaddress=0.0.0.0 connectport=3005 connectaddress=%WSL_IP%
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=%WSL_IP%

REM Show current port proxies
echo.
echo Current port proxies:
netsh interface portproxy show v4tov4

echo.
echo Testing connections...
powershell -Command "Test-NetConnection -ComputerName %WSL_IP% -Port 3005"
powershell -Command "Test-NetConnection -ComputerName %WSL_IP% -Port 8000"

echo.
echo Done! Try accessing:
echo   http://localhost:3005
echo   http://127.0.0.1:3005
echo   http://%WSL_IP%:3005
pause