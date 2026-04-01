@echo off
title ApexFit.ai - Startup Script
echo ========================================
echo    ApexFit.ai Body Fat Estimator
echo ========================================
echo.

REM Set the project directory
set PROJECT_DIR=C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app

REM Check if Python is available
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if Node is available
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo [INFO] Starting Python API on port 8313...
echo.

REM Start Python API in a new window
start "Python API - Port 8313" cmd /k "cd /d %PROJECT_DIR%\python-api && python -m uvicorn main:app --host 0.0.0.0 --port 8313"

REM Wait for Python API to start
echo [INFO] Waiting 5 seconds for Python API to initialize...
timeout /t 5 /nobreak >nul

echo [INFO] Starting Next.js Frontend on port 3005...
echo.

REM Start Next.js in a new window
start "Next.js Frontend - Port 3005" cmd /k "cd /d %PROJECT_DIR% && npm run dev -- -p 3005"

REM Wait for Next.js to start
echo [INFO] Waiting 10 seconds for Next.js to compile...
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo    Application Started Successfully
echo ========================================
echo.
echo    Frontend:   http://localhost:3005
echo    Python API: http://localhost:8313
echo.
echo    Note: Redis at 172.23.89.12:6385 is optional.
echo    The app will work using Python API data storage.
echo.
echo    Press any key to open the app in your browser...
pause >nul

start http://localhost:3005

echo.
echo [INFO] Two terminal windows are running the servers.
echo [INFO] Close those windows to stop the application.
echo.
pause
