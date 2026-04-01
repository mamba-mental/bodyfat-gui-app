# Remove Irrelevant Agents from Body Fat GUI App

$agentsPath = 'C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app\.claude\agents'

# Agents to REMOVE (irrelevant to this project)
$removeAgents = @(
    # Crypto/Blockchain/DeFi
    'arbitrage-bot.md',
    'blockchain-developer.md',
    'crypto-analyst.md',
    'crypto-risk-manager.md',
    'crypto-trader.md',
    'defi-strategist.md',
    
    # Financial Services
    'financial-analyst-fs.md',
    'pricing-strategist-fs.md',
    'risk-assessor-fs.md',
    
    # Marketing/Sales/Business
    'competitive-intelligence-mx.md',
    'customer-success-manager.md',
    'growth-hacker.md',
    'growth-hacker-gr.md',
    'market-research-analyst.md',
    'prd-writer.md',
    'product-manager-orchestrator.md',
    'sales-engineer-gr.md',
    
    # Infrastructure/DevOps
    'cloud-architect.md',
    'deployment-engineer.md',
    'devops-troubleshooter.md',
    'incident-responder.md',
    'kubernetes-architect.md',
    'terraform-specialist.md',
    
    # Other languages
    'golang-pro.md',
    'java-pro.md',
    'rust-pro.md',
    
    # Mobile
    'mobile-developer.md',
    
    # ML/AI specialized
    'ml-engineer.md',
    
    # Data engineering
    'data-engineer.md',
    
    # Organizational
    'agent-organizer.md',
    'context-manager.md',
    'integrator.md',
    'prompt-engineer.md',
    'security-auditor.md',
    'team-configurator.md',
    'tech-lead-orchestrator.md',
    'validation-gates.md',
    'workflow-orchestrator.md'
)

Set-Location $agentsPath

Write-Host "`nRemoving Irrelevant Agents`n" -ForegroundColor Cyan

$totalRemoved = 0

foreach ($agent in $removeAgents) {
    if (Test-Path $agent) {
        Remove-Item $agent -Force
        Write-Host "✅ Removed: $agent" -ForegroundColor Green
        $totalRemoved++
    } else {
        Write-Host "⚠️  Not found: $agent" -ForegroundColor Yellow
    }
}

Write-Host "`nTotal removed: $totalRemoved" -ForegroundColor Green
Write-Host "Remaining agents:" -ForegroundColor Cyan
Get-ChildItem -Filter "*.md" -File | Select-Object -ExpandProperty Name
