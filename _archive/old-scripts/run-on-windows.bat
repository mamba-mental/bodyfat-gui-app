@echo off
echo ================================================
echo   Body Fat Tracker - Windows Native Startup
echo ================================================
echo.

REM Check if Node.js is installed on Windows
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found on Windows
    echo.
    echo Please install Node.js for Windows from: https://nodejs.org/
    echo Or use WSL alternative method below:
    echo.
    echo WSL Alternative:
    echo 1. Open WSL terminal
    echo 2. cd to: /mnt/c/GitHub_Projects/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app
    echo 3. Run: npm run dev
    echo 4. Access via: http://172.23.89.12:3000
    echo.
    pause
    exit /b 1
)

echo Node.js version found:
node --version
echo.

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Set environment variables for Windows
set HOST=0.0.0.0
set PORT=6000

echo Starting Body Fat Tracker on Windows...
echo Server will be available at: http://localhost:6000
echo.
echo ================================================
echo   Press Ctrl+C to stop the server
echo ================================================
echo.

REM Start the development server
npm run dev