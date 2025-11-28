@echo off
echo ========================================================
echo   Body Fat Tracker - Windows Troubleshooting
echo ========================================================
echo.

echo Checking for port conflicts...
echo.

echo Checking port 3005:
netstat -ano | findstr :3005
if errorlevel 1 (
    echo Port 3005 is FREE
) else (
    echo WARNING: Port 3005 is in use!
    echo You may need to:
    echo   1. Close the application using this port
    echo   2. Or change to a different port
)

echo.
echo Checking port 8000:
netstat -ano | findstr :8000
if errorlevel 1 (
    echo Port 8000 is FREE
) else (
    echo WARNING: Port 8000 is in use!
    echo You may need to:
    echo   1. Close the application using this port
    echo   2. Or change to a different port
)

echo.
echo ========================================================
echo Checking Node.js installation...
echo ========================================================
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found in PATH
    echo Please install from: https://nodejs.org/
) else (
    echo Node.js location: 
    where node
    echo Version:
    node --version
)

echo.
echo ========================================================
echo Checking Python installation...
echo ========================================================
where python >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found in PATH
    echo Please install from: https://python.org/
) else (
    echo Python location:
    where python
    echo Version:
    python --version
)

echo.
echo ========================================================
echo Checking npm packages...
echo ========================================================
if exist "node_modules" (
    echo node_modules folder exists
    dir node_modules | find "File(s)"
) else (
    echo WARNING: node_modules not found!
    echo Run: npm install
)

echo.
echo ========================================================
echo Quick Fixes:
echo ========================================================
echo.
echo 1. If ports are in use:
echo    - Run: taskkill /F /IM node.exe
echo    - Run: taskkill /F /IM python.exe
echo.
echo 2. If dependencies are missing:
echo    - Run: npm install
echo    - Run: cd python-api && pip install -r requirements.txt
echo.
echo 3. If still having issues:
echo    - Delete node_modules folder and package-lock.json
echo    - Run: npm cache clean --force
echo    - Run: npm install
echo.
pause