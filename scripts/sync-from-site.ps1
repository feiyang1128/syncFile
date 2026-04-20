param(
    [string]$BaseUrl = "https://tv.feiyangyyds.cf"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$baseUri = [System.Uri]::new(($BaseUrl.TrimEnd("/") + "/"))

function Get-RelativePath {
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

$excludedPrefixes = @(
    ".git/",
    "scripts/"
)

$files = Get-ChildItem -Path $repoRoot -File -Recurse | Where-Object {
    $relativePath = Get-RelativePath -Root $repoRoot -Path $_.FullName
    foreach ($prefix in $excludedPrefixes) {
        if ($relativePath.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            return $false
        }
    }
    return $true
}

if (-not $files) {
    Write-Host "No local files found to sync."
    exit 0
}

$downloaded = @()
$missing = @()

foreach ($file in $files) {
    $relativePath = Get-RelativePath -Root $repoRoot -Path $file.FullName
    $remoteUri = [System.Uri]::new($baseUri, $relativePath)

    try {
        Invoke-WebRequest -Uri $remoteUri -OutFile $file.FullName -UseBasicParsing | Out-Null
        $downloaded += $relativePath
        Write-Host "Synced $relativePath"
    }
    catch {
        $response = $_.Exception.Response
        if ($response -and [int]$response.StatusCode -eq 404) {
            $missing += $relativePath
            Write-Host "Skipped $relativePath (404)"
            continue
        }

        throw
    }
}

Write-Host ""
Write-Host ("Synced {0} file(s)." -f $downloaded.Count)

if ($missing.Count -gt 0) {
    Write-Host ("Skipped {0} missing file(s)." -f $missing.Count)
}
