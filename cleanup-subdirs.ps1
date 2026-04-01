# Remove Irrelevant Agents from Subdirectories

$agentsPath = 'C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app\.claude\agents'

# Remove entire subdirectories that are not relevant
$removeDirs = @(
    'business',          # Business/product management - not needed
    'infrastructure',    # Cloud/DevOps - not using
    'security',          # Moved security-auditor to root already
    'specialization'     # Documentation specialists - have doc manager in root
)

# Individual files in subdirectories to remove
$removeFiles = @(
    # data-ai subdirectory - keep data-scientist, database-optimizer in root
    'data-ai\ai-engineer.md',
    'data-ai\data-engineer.md',  # Big data pipelines not needed
    'data-ai\graphql-architect.md',  # Not using GraphQL
    'data-ai\ml-engineer.md',    # Not doing ML engineering
    'data-ai\postgres-pro.md',   # Using SQLite not Postgres
    'data-ai\prompt-engineer.md',
    
    # development subdirectory - duplicates of root agents
    'development\backend-architect.md',
    'development\dx-optimizer.md',
    'development\electorn-pro.md',  # Not using Electron
    'development\frontend-developer.md',
    'development\full-stack-developer.md',
    'development\golang-pro.md',
    'development\legacy-modernizer.md',
    'development\mobile-developer.md',
    'development\nextjs-pro.md',  # Keep - this is Next.js specific!
    'development\python-pro.md',
    'development\react-pro.md',  # Keep - React specific!
    'development\typescript-pro.md',
    'development\ui-designer.md',
    'development\ux-designer.md',
    
    # quality-testing subdirectory - duplicates
    'quality-testing\architect-review.md',
    'quality-testing\code-reviewer.md',
    'quality-testing\debugger.md',
    'quality-testing\qa-expert.md',
    'quality-testing\test-automator.md'
)

# Actually, let me revise - KEEP nextjs-pro and react-pro, remove duplicates
$keepInDevelopment = @('nextjs-pro.md', 'react-pro.md')

Set-Location $agentsPath

Write-Host "`nCleaning up agent subdirectories`n" -ForegroundColor Cyan

# Remove entire directories
foreach ($dir in $removeDirs) {
    if (Test-Path $dir) {
        $count = (Get-ChildItem $dir -Recurse -File).Count
        Remove-Item $dir -Recurse -Force
        Write-Host "✅ Removed directory: $dir ($count files)" -ForegroundColor Green
    }
}

# Remove data-ai directory entirely (not doing data engineering)
if (Test-Path 'data-ai') {
    $count = (Get-ChildItem 'data-ai' -File).Count
    Remove-Item 'data-ai' -Recurse -Force
    Write-Host "✅ Removed directory: data-ai ($count files)" -ForegroundColor Green
}

# Clean development directory - keep only nextjs-pro and react-pro
if (Test-Path 'development') {
    $allDevFiles = Get-ChildItem 'development' -Filter '*.md' -File
    foreach ($file in $allDevFiles) {
        if ($file.Name -notin $keepInDevelopment) {
            Remove-Item $file.FullName -Force
            Write-Host "✅ Removed: development\$($file.Name)" -ForegroundColor Green
        } else {
            Write-Host "✓ Keeping: development\$($file.Name)" -ForegroundColor Cyan
        }
    }
}

# Remove quality-testing directory (all duplicates of root agents)
if (Test-Path 'quality-testing') {
    $count = (Get-ChildItem 'quality-testing' -File).Count
    Remove-Item 'quality-testing' -Recurse -Force
    Write-Host "✅ Removed directory: quality-testing ($count files)" -ForegroundColor Green
}

Write-Host "`nFinal agent structure:" -ForegroundColor Cyan
Get-ChildItem -Recurse -Filter '*.md' -File | Select-Object FullName | ForEach-Object {
    $rel = $_.FullName.Replace($agentsPath, '').TrimStart('\')
    Write-Host "  ✓ $rel" -ForegroundColor Gray
}
