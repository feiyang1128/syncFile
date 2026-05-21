param(
    [string]$ConfigPath = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$defaultConfigPath = Join-Path $PSScriptRoot "sync-from-site.json"

if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
    $ConfigPath = $defaultConfigPath
}

if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "Sync config file not found: $ConfigPath"
}

function Get-RepoRelativePath {
    param(
        [string]$Root,
        [string]$Path
    )

    $normalizedRoot = ($Root.TrimEnd("\") + "\")
    if ($Path.StartsWith($normalizedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $Path.Substring($normalizedRoot.Length).Replace("\", "/")
    }

    throw "Path '$Path' is outside of repo root '$Root'."
}

function Resolve-RepoFilePath {
    param(
        [string]$Root,
        [string]$RelativePath
    )

    $fullPath = [System.IO.Path]::GetFullPath((Join-Path $Root $RelativePath))
    $null = Get-RepoRelativePath -Root $Root -Path $fullPath

    return $fullPath
}

function Ensure-ParentDirectory {
    param(
        [string]$FilePath
    )

    $parent = Split-Path -Parent $FilePath
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
}

function Get-SyncEntries {
    param(
        [string]$Path
    )

    $config = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json

    if (-not $config -or -not $config.files) {
        throw "Config file '$Path' must contain a 'files' array."
    }

    $entries = @($config.files)

    if ($entries.Count -eq 0) {
        Write-Host "No sync entries found in $Path."
        exit 0
    }

    return $entries
}

function Test-IsNotFoundResponse {
    param(
        [System.Management.Automation.ErrorRecord]$ErrorRecord
    )

    $response = $ErrorRecord.Exception.Response
    return $response -and [int]$response.StatusCode -eq 404
}

function Get-BeijingTimestamp {
    $utcNow = [System.DateTime]::UtcNow
    $beijingZone = [System.TimeZoneInfo]::FindSystemTimeZoneById("China Standard Time")
    $beijingNow = [System.TimeZoneInfo]::ConvertTimeFromUtc($utcNow, $beijingZone)
    return $beijingNow.ToString("yyyy-MM-dd HH:mm:ss")
}

function Get-TimestampCommentStyle {
    param(
        [string]$FilePath
    )

    $extension = [System.IO.Path]::GetExtension($FilePath).ToLowerInvariant()
    $lineCommentSlashExtensions = @(
        ".js", ".cjs", ".mjs", ".ts", ".tsx", ".jsx",
        ".java", ".c", ".h", ".cc", ".cpp", ".hpp", ".cs",
        ".go", ".rs", ".swift", ".kt", ".kts", ".scala",
        ".dart", ".php", ".scss", ".less"
    )
    $hashCommentExtensions = @(
        ".yaml", ".yml", ".py", ".rb", ".pl", ".pm",
        ".sh", ".bash", ".zsh", ".ps1", ".psm1", ".psd1",
        ".toml", ".conf", ".config", ".env", ".txt", ".properties"
    )
    $semicolonCommentExtensions = @(".ini", ".cfg")
    $dashCommentExtensions = @(".sql", ".lua")
    $xmlCommentExtensions = @(".html", ".htm", ".xml", ".svg", ".md")
    $unsupportedExtensions = @(
        ".json", ".jsonc", ".lock", ".png", ".jpg", ".jpeg", ".gif",
        ".webp", ".ico", ".pdf", ".zip", ".7z", ".rar", ".gz",
        ".mp3", ".mp4", ".mov", ".exe", ".dll", ".bin"
    )

    if ($extension -in $unsupportedExtensions) {
        return $null
    }
    if ($extension -in $lineCommentSlashExtensions) {
        return @{ Prefix = "// "; Suffix = "" }
    }
    if ($extension -in $hashCommentExtensions) {
        return @{ Prefix = "# "; Suffix = "" }
    }
    if ($extension -in $semicolonCommentExtensions) {
        return @{ Prefix = "; "; Suffix = "" }
    }
    if ($extension -in $dashCommentExtensions) {
        return @{ Prefix = "-- "; Suffix = "" }
    }
    if ($extension -in $xmlCommentExtensions) {
        return @{ Prefix = "<!-- "; Suffix = " -->" }
    }

    return @{ Prefix = "# "; Suffix = "" }
}

function Set-UpdatedTimestampComment {
    param(
        [string]$FilePath
    )

    $commentStyle = Get-TimestampCommentStyle -FilePath $FilePath
    if ($null -eq $commentStyle) {
        return
    }

    $timestamp = Get-BeijingTimestamp
    $commentPrefix = [string]$commentStyle.Prefix
    $commentSuffix = [string]$commentStyle.Suffix
    $timestampLine = "{0}更新时间:{1}{2}" -f $commentPrefix, $timestamp, $commentSuffix
    $existingContent = ""

    if (Test-Path -LiteralPath $FilePath) {
        $existingContent = Get-Content -LiteralPath $FilePath -Raw
    }

    $newline = "`r`n"
    if ($existingContent -match "`n" -and $existingContent -notmatch "`r`n") {
        $newline = "`n"
    }

    $normalizedContent = $existingContent
    $escapedPrefix = [System.Text.RegularExpressions.Regex]::Escape($commentPrefix)
    $escapedSuffix = [System.Text.RegularExpressions.Regex]::Escape($commentSuffix)
    $pattern = "^(?:$escapedPrefix更新时间:\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$escapedSuffix(?:\r?\n)?)"
    if ($normalizedContent -match $pattern) {
        $normalizedContent = [System.Text.RegularExpressions.Regex]::Replace(
            $normalizedContent,
            $pattern,
            "",
            [System.Text.RegularExpressions.RegexOptions]::Multiline
        )
    }

    $updatedContent = if ([string]::IsNullOrEmpty($normalizedContent)) {
        $timestampLine + $newline
    }
    else {
        $timestampLine + $newline + $normalizedContent
    }

    [System.IO.File]::WriteAllText($FilePath, $updatedContent, [System.Text.UTF8Encoding]::new($false))
}

function Sync-FileEntry {
    param(
        [string]$Root,
        [pscustomobject]$Entry
    )

    if ([string]::IsNullOrWhiteSpace($Entry.path)) {
        throw "Each sync entry must define a non-empty 'path'."
    }
    if ([string]::IsNullOrWhiteSpace($Entry.url)) {
        throw "Sync entry for '$($Entry.path)' must define a non-empty 'url'."
    }

    $relativePath = $Entry.path.Replace("\", "/")
    $filePath = Resolve-RepoFilePath -Root $Root -RelativePath $relativePath
    $remoteUri = [System.Uri]::new($Entry.url)
    Ensure-ParentDirectory -FilePath $filePath
    $tempFilePath = [System.IO.Path]::GetTempFileName()

    try {
        Invoke-WebRequest -Uri $remoteUri -OutFile $tempFilePath -UseBasicParsing | Out-Null
        Move-Item -LiteralPath $tempFilePath -Destination $filePath -Force
        Set-UpdatedTimestampComment -FilePath $filePath
        return [PSCustomObject]@{
            Status = "Synced"
            Path = $relativePath
        }
    }
    catch {
        if (Test-IsNotFoundResponse -ErrorRecord $_) {
            return [PSCustomObject]@{
                Status = "Missing"
                Path = $relativePath
            }
        }

        $message = $_.Exception.Message
        return [PSCustomObject]@{
            Status = "Failed"
            Path = $relativePath
            Error = $message
        }
    }
    finally {
        if (Test-Path -LiteralPath $tempFilePath) {
            Remove-Item -LiteralPath $tempFilePath -Force
        }
    }
}

function Write-Summary {
    param(
        [object[]]$Results
    )

    $synced = @($Results | Where-Object { $_.Status -eq "Synced" })
    $missing = @($Results | Where-Object { $_.Status -eq "Missing" })
    $failed = @($Results | Where-Object { $_.Status -eq "Failed" })

    foreach ($item in $synced) {
        Write-Host ("[OK] {0}" -f $item.Path)
    }

    foreach ($item in $missing) {
        Write-Host ("[SKIP] {0} (404)" -f $item.Path)
    }

    foreach ($item in $failed) {
        Write-Host ("[FAIL] {0}" -f $item.Path)
        Write-Host ("       {0}" -f $item.Error)
    }

    Write-Host ""
    Write-Host "Summary"
    Write-Host ("  OK:   {0}" -f $synced.Count)
    Write-Host ("  Skip: {0}" -f $missing.Count)
    Write-Host ("  Fail: {0}" -f $failed.Count)

    return $failed.Count -gt 0
}

$entries = Get-SyncEntries -Path $ConfigPath
$results = foreach ($entry in $entries) {
    Sync-FileEntry -Root $repoRoot -Entry $entry
}

$null = Write-Summary -Results $results
