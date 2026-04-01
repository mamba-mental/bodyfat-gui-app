# Remove Irrelevant Agents from Subdirectories

$agentsPath = 'C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app\.claude\agents'
Set-Location $agentsPath

Write-Host "Cleaning up agent subdirectories" -ForegroundColor Cyan

# Remove entire directories
$removeDirs = @('business', 'infrastructure', 'security', 'specialization', 'data-ai', 'quality-testing')

foreach ($dir in $removeDirs) {
    if (Test-Path $dir) {
        $count = (Get-ChildItem $dir -Recurse -File).Count
        Remove-Item $dir -Recurse -Force
        Write-Host "Removed directory: $dir - $count files" -ForegroundColor Green
    }
}

# Clean development directory - keep only nextjs-pro and react-pro
if (Test-Path 'development') {
    $keepFiles = @('nextjs-pro.md', 'react-pro.md')
    $allDevFiles = Get-ChildItem 'development' -Filter '*.md' -File
    
    foreach ($file in $allDevFiles) {
        if ($file.Name -notin $keepFiles) {
            Remove-Item $file.FullName -Force
            Write-Host "Removed: development\$($file.Name)" -ForegroundColor Green
        } else {
            Write-Host "Keeping: development\$($file.Name)" -ForegroundColor Cyan
        }
    }
}

Write-Host "Final agent list:" -ForegroundColor Cyan
Get-ChildItem -Recurse -Filter '*.md' -File | Select-Object -ExpandProperty Name
