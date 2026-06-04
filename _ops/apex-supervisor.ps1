# ApexFit Supervisor — keeps the API (:8313) and web (:3010) alive.
# Restart-on-death watchdog loop. Run via Scheduled Task "ApexFit-Supervisor"
# (registered to start at logon + auto-restart if the task itself stops).
# ASCII-only to avoid CP1252 encoding issues when loaded via -File.
$ErrorActionPreference = 'Continue'
# Dodge the PowerShell InitializeDefaultDrives FileSystem-provider CWD bug.
Set-Location $env:USERPROFILE

$Root    = 'C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app'
$ApiDir  = Join-Path $Root 'python-api'
$DataDir = Join-Path $Root 'data'
$Python  = 'C:\Users\tiran\AppData\Local\Programs\Python\Python313\python.exe'
$LogDir  = Join-Path $Root '_ops'
$Log     = Join-Path $LogDir 'supervisor.log'

# Pin the DB to the real data dir + force reload off for the spawned API.
$env:DATA_DIR = $DataDir
$env:BODYFAT_DEV_RELOAD = '0'

function Log([string]$m) {
    $stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    "$stamp  $m" | Out-File -FilePath $Log -Append -Encoding utf8
}
function PortUp([int]$p) {
    [bool](Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)
}

Log "=== ApexFit supervisor started (PID $PID) ==="

# Fallback python if the pinned interpreter is missing.
if (-not (Test-Path $Python)) {
    $resolved = (Get-Command python -ErrorAction SilentlyContinue).Source
    if ($resolved) { $Python = $resolved }
    Log "pinned python missing; using $Python"
}

while ($true) {
    try {
        if (-not (PortUp 8313)) {
            Log "API :8313 DOWN -> starting (python main.py, reload off)"
            Start-Process -FilePath $Python -ArgumentList 'main.py' `
                -WorkingDirectory $ApiDir -WindowStyle Hidden
            Start-Sleep -Seconds 8
            if (PortUp 8313) { Log "API :8313 UP" } else { Log "API :8313 still down after start attempt" }
        }
        if (-not (PortUp 3010)) {
            Log "Web :3010 DOWN -> starting (npm run dev / next dev)"
            Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm run dev' `
                -WorkingDirectory $Root -WindowStyle Hidden
            Start-Sleep -Seconds 12
            if (PortUp 3010) { Log "Web :3010 UP" } else { Log "Web :3010 still starting" }
        }
    } catch {
        Log ("loop error: " + $_.Exception.Message)
    }
    Start-Sleep -Seconds 10
}
