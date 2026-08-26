$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$hooksPath = Join-Path $repoRoot ".githooks"

if (-not (Test-Path -LiteralPath $hooksPath)) {
    throw "Hooks directory not found: $hooksPath"
}

git -C $repoRoot config core.hooksPath .githooks
Write-Host "Git hooks enabled: .githooks"
