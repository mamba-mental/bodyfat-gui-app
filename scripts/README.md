# ApexFit.ai Startup Scripts

Quick scripts to start and stop the ApexFit.ai Body Fat Estimator application.

## Prerequisites

Before running these scripts, ensure you have:

- **Python 3.x** installed and in PATH
- **Node.js** installed and in PATH
- **Redis** (optional) - The app works without it using Python API storage

## Scripts

### start-app.bat

**What it does:**
1. Verifies Python and Node.js are installed
2. Starts the Python API server on port 8001
3. Waits 5 seconds for the API to initialize
4. Starts the Next.js frontend on port 3005
5. Waits 10 seconds for Next.js to compile
6. Opens your browser to http://localhost:3005

**How to use:**
- Double-click `start-app.bat`
- Wait for both servers to start
- Press any key to open the browser

**After running:**
- Two terminal windows will remain open (one for each server)
- Keep these windows open while using the app

---

### stop-app.bat

**What it does:**
1. Kills all Node.js processes (stops Next.js)
2. Kills all Python processes (stops the API)

**How to use:**
- Double-click `stop-app.bat`
- Confirm the processes were stopped

**Warning:** This script kills ALL Node.js and Python processes on your system, not just the ApexFit servers. If you have other Node.js or Python apps running, close the server windows manually instead.

---

## Server Details

| Server | Port | URL |
|--------|------|-----|
| Next.js Frontend | 3005 | http://localhost:3005 |
| Python API | 8001 | http://localhost:8001 |
| Redis (optional) | 6385 | localhost:6385 |

## Troubleshooting

### Port already in use
If you see "EADDRINUSE" errors, a server is already running. Either:
- Use the existing servers (refresh browser)
- Run `stop-app.bat` first, then `start-app.bat`

### Python/Node not found
Ensure Python and Node.js are installed and added to your system PATH.

### App won't load
1. Check both terminal windows for errors
2. Verify the Python API is running: http://localhost:8001
3. Try refreshing the browser after 15-20 seconds

## Alternative: Manual Stop

Instead of using `stop-app.bat`, you can simply close the two terminal windows that `start-app.bat` opens. This is safer if you have other Python/Node apps running.
