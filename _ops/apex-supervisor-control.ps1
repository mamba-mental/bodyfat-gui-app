[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('pause', 'start', 'stop')]
    [string]$Action
)

$ErrorActionPreference = 'Stop'
$SupervisorPath = Join-Path $PSScriptRoot 'apex-supervisor.ps1'
$StateDirectory = Join-Path $env:LOCALAPPDATA 'ApexFit'
$StopFile = Join-Path $StateDirectory 'supervisor.disabled'

function Stop-RunningSupervisor {
    $escapedPath = [regex]::Escape($SupervisorPath)
    $processes = Get-CimInstance Win32_Process | Where-Object {
        $_.CommandLine -and $_.CommandLine -match $escapedPath
    }
    foreach ($process in $processes) {
        Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

if ($Action -in @('pause', 'stop')) {
    New-Item -ItemType Directory -Path $StateDirectory -Force | Out-Null
    New-Item -ItemType File -Path $StopFile -Force | Out-Null
    Stop-RunningSupervisor
    Write-Output "ApexFit supervisor paused."
    exit 0
}

Remove-Item -LiteralPath $StopFile -Force -ErrorAction SilentlyContinue
$running = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -and $_.CommandLine -match ([regex]::Escape($SupervisorPath))
}
if (-not $running) {
    $powerShell = (Get-Command pwsh.exe -ErrorAction SilentlyContinue).Source
    if (-not $powerShell) {
        $powerShell = (Get-Command powershell.exe).Source
    }
    $arguments = '-NoProfile -NonInteractive -WindowStyle Hidden ' +
        '-ExecutionPolicy Bypass -File "' + $SupervisorPath + '"'
    Start-Process -FilePath $powerShell -ArgumentList $arguments -WindowStyle Hidden
}
Write-Output "ApexFit supervisor started."
