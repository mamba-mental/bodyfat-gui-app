@echo off
echo ================================================
echo   Quick Fix for Data Display
echo ================================================
echo.

cd /d "C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app"

echo Creating environment config...
(
echo NEXT_PUBLIC_API_URL=http://localhost:8000
echo NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8000
echo NODE_ENV=development
echo NEXT_PUBLIC_APP_URL=http://localhost:3005
echo HOSTNAME=0.0.0.0
echo PORT=3005
echo NEXT_PUBLIC_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3005,http://localhost:4000,http://localhost:5000,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002,http://127.0.0.1:3005,http://127.0.0.1:4000,http://127.0.0.1:5000
) > .env.local

echo.
echo Environment updated!
echo.
echo IMPORTANT: The app uses local JSON storage, not a database.
echo Data is stored in: data/apexfit-data.json
echo.
echo Please restart both servers:
echo 1. Close all command windows
echo 2. Run FIX_AND_START.bat again
echo.
pause