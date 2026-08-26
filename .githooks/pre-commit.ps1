$ErrorActionPreference = "Stop"

$limitBytes = 104857600
$stagedFiles = @(git diff --cached --name-only --diff-filter=ACMRT)

foreach ($path in $stagedFiles) {
    if ([string]::IsNullOrWhiteSpace($path)) {
        continue
    }

    $size = [int64](git cat-file -s ":$path" 2>$null)
    if ($size -ge $limitBytes) {
        Write-Error "Blocked large staged file: $path ($size bytes). Files >= 100 MiB should not be committed to Git. Upload them as release assets instead."
        exit 1
    }
}

powershell -ExecutionPolicy Bypass -File ./scripts/generate-mihomo-custom.ps1 -Check
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
