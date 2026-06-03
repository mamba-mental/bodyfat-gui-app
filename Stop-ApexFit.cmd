@echo off
REM ApexFit Tracker — STOP. Thin wrapper over the TDD-verified lifecycle module.
REM Force-kills whatever is listening on :8313 (API) and :3010 (web). Idempotent:
REM safe to run when the app is already stopped (reports 0 killed, never errors).
title Stop ApexFit
cd /d "C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app"
python "_ops\apex_lifecycle.py" stop
exit
