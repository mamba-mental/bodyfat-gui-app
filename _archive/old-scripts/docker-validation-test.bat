@echo off
echo ========================================
echo Docker Validation Test
echo ========================================
echo.

REM Step 1: Create required directories
echo [Step 1/6] Creating data directories...
if not exist "nas-data" mkdir nas-data
if not exist "nas-uploads" mkdir nas-uploads
if not exist "nas-exports" mkdir nas-exports
echo - Directories created
echo.

REM Step 2: Copy existing data if it exists
echo [Step 2/6] Copying existing data (if any)...
if exist "data" (
    echo - Copying from data/ to nas-data/...
    xcopy /E /I /Y data nas-data >nul 2>&1
    echo - Data copied
) else (
    echo - No existing data/ directory found
)
echo.

REM Step 3: Stop any running containers
echo [Step 3/6] Stopping any existing containers...
docker-compose down
echo - Containers stopped
echo.

REM Step 4: Build fresh images
echo [Step 4/6] Building Docker images...
echo - This may take 2-5 minutes for first build...
docker-compose build --no-cache
if errorlevel 1 (
    echo ERROR: Docker build failed!
    pause
    exit /b 1
)
echo - Images built successfully
echo.

REM Step 5: Start containers
echo [Step 5/6] Starting containers...
docker-compose up -d
if errorlevel 1 (
    echo ERROR: Failed to start containers!
    pause
    exit /b 1
)
echo - Containers starting...
echo.

REM Step 6: Wait and show status
echo [Step 6/6] Waiting for services to be ready...
timeout /t 10 /nobreak >nul
echo.

echo ========================================
echo Container Status:
echo ========================================
docker-compose ps
echo.

echo ========================================
echo Validation URLs:
echo ========================================
echo Next.js App:    http://localhost:7888
echo Python API:     http://localhost:8001
echo.
echo Health Check:   http://localhost:8001/health
echo ========================================
echo.

echo TESTING INSTRUCTIONS:
echo 1. Open http://localhost:7888 in your browser
echo 2. Test PDF download
echo 3. Test New Program button
echo 4. Test Coming Soon section
echo 5. Test Changelog
echo.
echo To view logs: docker-compose logs -f
echo To stop:      docker-compose down
echo.

pause
