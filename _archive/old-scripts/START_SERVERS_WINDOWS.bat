@echo off
echo ================================================
echo   Starting Body Fat Tracker - Windows Mode
echo ================================================
echo.

cd /d "C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app"

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install from https://python.org/
    pause
    exit /b 1
)

echo Found Node.js and Python
echo.

REM Install npm dependencies if needed
if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm install
)

REM Start Python API in new window
echo Starting Python API on port 8000...
start "Python API" cmd /k "cd python-api && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM Wait a moment
timeout /t 3 /nobreak >nul

REM Start Next.js in new window
echo Starting Next.js on port 3005...
start "Next.js App" cmd /k "set HOST=0.0.0.0 && set PORT=3005 && npx next dev --port 3005"

echo.
echo ================================================
echo   Both servers are starting...
echo ================================================
echo.
echo Next.js will be available at: http://localhost:3005
echo Python API will be available at: http://localhost:8000
echo.
echo Two new windows have been opened for the servers.
echo Close those windows to stop the servers.
echo.
pause