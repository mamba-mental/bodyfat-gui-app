@echo off
REM ApexFit Tracker — START. Thin wrapper over the TDD-verified lifecycle module
REM (_ops\apex_lifecycle.py). Starts API (:8313) + web (:3010) if down, waits
REM until reachable, opens the app in Brave. Idempotent + safe to double-click.
title ApexFit Tracker
cd /d "C:\GitHub_Projects\2025.0629 - Body-Fat Estimator Terminal Standalone\bodyfat-gui-app"
REM Pause the watchdog while the lifecycle module starts one canonical copy.
REM This avoids duplicate Next.js processes racing during the first compile.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "_ops\apex-supervisor-control.ps1" pause
REM No prebuild: the web runs in dev mode (next dev) which compiles on demand.
REM Pre-building (npm run build) here used to clobber a running dev server's chunks,
REM producing a blank page with 404 assets. Dev mode needs no build step.
REM First page load takes ~15-20s while Next compiles; after that it's instant.
python "_ops\apex_lifecycle.py" start
if errorlevel 1 goto launch_failed
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "_ops\apex-supervisor-control.ps1" start
exit /b 0

:launch_failed
echo.
echo ApexFit did not become healthy. The supervisor was left off to prevent a restart loop.
echo Please close this window and report this message.
pause
exit /b 1
