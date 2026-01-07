@echo off
echo Starting Body Fat Tracker from Windows...
echo.

REM Navigate to project directory
cd /d "C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app"

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js not found in Windows PATH
    echo Please install Node.js for Windows or use WSL method
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

REM Start the development server
echo Starting Next.js development server...
echo Server will be available at: http://localhost:3001
echo.
set HOST=0.0.0.0
set PORT=3001
npm run dev