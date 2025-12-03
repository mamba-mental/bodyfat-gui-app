@echo off
title ApexFit.ai - Stop Script
echo ========================================
echo    Stopping ApexFit.ai Services
echo ========================================
echo.

echo [INFO] Stopping Node.js processes (Next.js)...
taskkill /F /IM node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js processes stopped
) else (
    echo [INFO] No Node.js processes were running
)

echo.
echo [INFO] Stopping Python processes (uvicorn)...
taskkill /F /IM python.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Python processes stopped
) else (
    echo [INFO] No Python processes were running
)

echo.
echo ========================================
echo    All Services Stopped
echo ========================================
echo.
pause
