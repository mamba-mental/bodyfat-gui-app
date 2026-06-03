@echo off
REM ApexFit Tracker — START. Thin wrapper over the TDD-verified lifecycle module
REM (_ops\apex_lifecycle.py). Starts API (:8313) + web (:3010) if down, waits
REM until reachable, opens the app in Brave. Idempotent + safe to double-click.
title ApexFit Tracker
cd /d "C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app"
if not exist ".next\BUILD_ID" (
  echo First run: building the web app ^(one-time, ~1 min^)...
  call npm run build
)
python "_ops\apex_lifecycle.py" start
exit
