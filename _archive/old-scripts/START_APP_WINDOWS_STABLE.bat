@echo off
echo ========================================================
echo ========================================================
start "Python API - Body Fat Tracker" cmd /k "cd python-api && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001"

REM Wait for Python to start
echo Waiting for Python API to start...
timeout /t 5 /nobreak >nul

REM Start Next.js
echo.
echo ========================================================
echo Starting Next.js server on port 3005...
echo ========================================================
start "Next.js - Body Fat Tracker" cmd /k "npx next dev --port 3005"

REM Wait for services to start
echo.
echo Waiting for services to fully start...
timeout /t 10 /nobreak >nul

REM Final instructions
echo.
echo ========================================================
echo   STARTUP COMPLETE!
echo ========================================================
echo.
echo Your Body Fat Tracker is now running:
echo.
echo   Main App:    http://localhost:3005
echo   Python API:  http://localhost:8001
echo   API Docs:    http://localhost:8001/docs
echo.
echo Two command windows are now open:
echo   - Python API Server
echo   - Next.js Development Server
echo.
echo To stop the servers, close both command windows.
echo.
echo If you see errors:
echo   1. Make sure no other apps are using ports 3005 or 8001
echo   2. Try running this script as Administrator
echo   3. Check Windows Firewall isn't blocking the ports
echo.
pause