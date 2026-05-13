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
