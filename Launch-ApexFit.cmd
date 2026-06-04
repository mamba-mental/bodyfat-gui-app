@echo off
REM ApexFit Tracker — START. Thin wrapper over the TDD-verified lifecycle module
REM (_ops\apex_lifecycle.py). Starts API (:8313) + web (:3010) if down, waits
REM until reachable, opens the app in Brave. Idempotent + safe to double-click.
title ApexFit Tracker
cd /d "C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app"
REM No prebuild: the web runs in dev mode (next dev) which compiles on demand.
REM Pre-building (npm run build) here used to clobber a running dev server's chunks,
REM producing a blank page with 404 assets. Dev mode needs no build step.
REM First page load takes ~15-20s while Next compiles; after that it's instant.
python "_ops\apex_lifecycle.py" start
exit
