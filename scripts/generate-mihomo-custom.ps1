param(
    [string]$SourcePath = "",
    [string]$TargetPath = "",
    [switch]$Check
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

if ([string]::IsNullOrWhiteSpace($SourcePath)) {
    $SourcePath = Join-Path $repoRoot "Mihomo/file/proxy-groups.yml"
}
if ([string]::IsNullOrWhiteSpace($TargetPath)) {
    $TargetPath = Join-Path $repoRoot "Mihomo/file/feiyang_custom.ini"
}

if (-not (Test-Path -LiteralPath $SourcePath)) {
    throw "Proxy group source not found: $SourcePath"
}
if (-not (Test-Path -LiteralPath $TargetPath)) {
    throw "Mihomo custom ini not found: $TargetPath"
}

function Read-ProxyGroups {
    param([string]$Path)

    $groups = @()
    $current = $null
    $currentListKey = $null

    foreach ($rawLine in Get-Content -LiteralPath $Path -Encoding UTF8) {
        $line = $rawLine.TrimEnd()

        if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith("#") -or $line.Trim() -eq "groups:") {
            continue
        }

        if ($line -match '^\s{2}- name:\s*(.+?)\s*$') {
            if ($null -ne $current) {
                $groups += [PSCustomObject]$current
            }
            $current = [ordered]@{
                name = $Matches[1]
                proxies = @()
            }
            $currentListKey = $null
            continue
        }

        if ($null -eq $current) {
            continue
        }

        if ($line -match '^\s{4}([A-Za-z][A-Za-z0-9_-]*):\s*(.*?)\s*$') {
            $key = $Matches[1]
            $value = $Matches[2]
            if ($value -eq "") {
                $current[$key] = @()
                $currentListKey = $key
            }
            else {
                $current[$key] = $value
                $currentListKey = $null
            }
            continue
        }

        if ($line -match '^\s{6}-\s*(.+?)\s*$' -and $currentListKey) {
            $current[$currentListKey] = @($current[$currentListKey]) + $Matches[1]
        }
    }

    if ($null -ne $current) {
        $groups += [PSCustomObject]$current
    }

    return $groups
}

function ConvertTo-CustomProxyGroupLine {
    param([pscustomobject]$Group)

    if ([string]::IsNullOrWhiteSpace($Group.name) -or [string]::IsNullOrWhiteSpace($Group.type)) {
        throw "Each group must define name and type."
    }

    $parts = @($Group.name, $Group.type)

    foreach ($proxy in @($Group.proxies)) {
        $parts += "[]$proxy"
    }

    if (-not [string]::IsNullOrWhiteSpace($Group.filter)) {
        $parts += $Group.filter
    }

    if (-not [string]::IsNullOrWhiteSpace($Group.url)) {
        $parts += $Group.url
    }

    if ($null -ne $Group.interval -and "$($Group.interval)" -ne "") {
        if ($null -ne $Group.tolerance -and "$($Group.tolerance)" -ne "") {
            $parts += "$($Group.interval),,$($Group.tolerance)"
        }
        else {
            $parts += "$($Group.interval)"
        }
    }

    if (-not [string]::IsNullOrWhiteSpace($Group.strategy)) {
        $parts += $Group.strategy
    }

    return "custom_proxy_group=" + ($parts -join '`')
}

$groups = Read-ProxyGroups -Path $SourcePath
if ($groups.Count -eq 0) {
    throw "No proxy groups found in $SourcePath"
}

$generatedLines = @($groups | ForEach-Object { ConvertTo-CustomProxyGroupLine -Group $_ })
$content = Get-Content -LiteralPath $TargetPath -Raw -Encoding UTF8
$originalBytes = [System.IO.File]::ReadAllBytes($TargetPath)
$newline = if ($originalBytes -contains 13) { "`r`n" } else { "`n" }
$generatedBlock = ($generatedLines -join $newline)

$pattern = '(?ms)^custom_proxy_group=.*?(?:\r?\n)(?=enable_rule_generator=)'
if ($content -notmatch $pattern) {
    throw "Could not find custom_proxy_group block before enable_rule_generator in $TargetPath"
}

$replacement = $generatedBlock + $newline + $newline
$updated = [regex]::Replace(
    $content,
    $pattern,
    [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $replacement },
    [System.Text.RegularExpressions.RegexOptions]::Multiline -bor [System.Text.RegularExpressions.RegexOptions]::Singleline,
    [timespan]::FromSeconds(5)
)

if ($Check) {
    if ($updated -ne $content) {
        Write-Error "Mihomo custom proxy groups are out of date. Run: powershell -ExecutionPolicy Bypass -File .\scripts\generate-mihomo-custom.ps1"
        exit 1
    }

    Write-Host "Mihomo custom proxy groups are up to date."
    exit 0
}

[System.IO.File]::WriteAllText($TargetPath, $updated, [System.Text.UTF8Encoding]::new($false))

Write-Host "Generated $($groups.Count) custom_proxy_group entries."
