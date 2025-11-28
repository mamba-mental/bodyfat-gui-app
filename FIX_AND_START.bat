@echo off
echo ================================================
echo   Fixing and Starting Body Fat Tracker
echo ================================================
echo.

cd /d "C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app"

REM Delete node_modules to ensure clean install
echo Cleaning old dependencies...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

REM Install fresh dependencies
echo Installing dependencies (this may take a few minutes)...
call npm install

REM Now start the servers
echo.
echo Starting servers...

REM Start Python API
start "Python API" cmd /k "cd python-api && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM Wait a bit
timeout /t 3 /nobreak >nul

REM Start Next.js using npx
start "Next.js App" cmd /k "npx next dev --port 3005"

echo.
echo ================================================
echo Servers are starting...
echo ================================================
echo.
echo Next.js: http://localhost:3005
echo Python API: http://localhost:8000
echo.
pause