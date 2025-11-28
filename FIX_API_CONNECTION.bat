@echo off
echo Fixing API connection...

cd /d "C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app"

REM Update the .env.local file to point to correct API
echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
echo NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8000 >> .env.local
echo NODE_ENV=development >> .env.local

echo API connection fixed!
echo Please restart the Next.js server (close and rerun the batch file)
pause