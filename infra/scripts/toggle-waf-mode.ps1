# Toggle WAF Mode between COUNT and BLOCK
# Usage: .\scripts\toggle-waf-mode.ps1 [count|block]

param(
    [Parameter(Position=0)]
    [ValidateSet("count", "block")]
    [string]$Mode = "count"
)

$ErrorActionPreference = "Stop"

$WAF_STACK = "lib\stacks\waf-stack.ts"

Write-Host "🔄 Switching WAF to $($Mode.ToUpper()) mode..." -ForegroundColor Cyan

if ($Mode -eq "block") {
    # Switch to BLOCK mode
    Write-Host "⚠️  WARNING: This will BLOCK malicious traffic!" -ForegroundColor Yellow
    $response = Read-Host "Continue? (y/n)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "Aborted." -ForegroundColor Red
        exit 1
    }

    # Read file content
    $content = Get-Content $WAF_STACK -Raw

    # For managed rules - switch to BLOCK
    $content = $content -replace 'count: \{\}, // COUNT mode for testing', '// count: {}, // COUNT mode for testing'
    $content = $content -replace '// none: \{\}, // Use this for BLOCK mode', 'none: {}, // Use this for BLOCK mode'

    # For custom rules - switch to BLOCK
    $content = $content -replace 'count: \{\}, // COUNT mode for testing', '// count: {}, // COUNT mode for testing'
    $content = $content -replace '// block: \{\}, // Use this for BLOCK mode', 'block: {}, // Use this for BLOCK mode'

    # Write back
    Set-Content $WAF_STACK -Value $content -NoNewline

    Write-Host "✅ WAF configured to BLOCK mode" -ForegroundColor Green
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Review changes: git diff $WAF_STACK"
    Write-Host "   2. Deploy: npm run cdk:deploy:dev"
    Write-Host "   3. Test: npm run test:waf"
}
else {
    # Switch to COUNT mode
    Write-Host "ℹ️  Switching to COUNT mode (safe for testing)" -ForegroundColor Blue

    # Read file content
    $content = Get-Content $WAF_STACK -Raw

    # For managed rules - switch to COUNT
    $content = $content -replace '// count: \{\}, // COUNT mode for testing', 'count: {}, // COUNT mode for testing'
    $content = $content -replace 'none: \{\}, // Use this for BLOCK mode', '// none: {}, // Use this for BLOCK mode'

    # For custom rules - switch to COUNT
    $content = $content -replace '// count: \{\}, // COUNT mode for testing', 'count: {}, // COUNT mode for testing'
    $content = $content -replace 'block: \{\}, // Use this for BLOCK mode', '// block: {}, // Use this for BLOCK mode'

    # Write back
    Set-Content $WAF_STACK -Value $content -NoNewline

    Write-Host "✅ WAF configured to COUNT mode" -ForegroundColor Green
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Review changes: git diff $WAF_STACK"
    Write-Host "   2. Deploy: npm run cdk:deploy:dev"
    Write-Host "   3. Test: npm run test:waf"
}

Write-Host ""
Write-Host "🎯 Summary:" -ForegroundColor Magenta
Write-Host "   Mode: $($Mode.ToUpper())"
Write-Host "   File: $WAF_STACK"
Write-Host "   Status: Ready to deploy"
