# Copy photos from facebook-import/ into gallery/ for the birthday site.
# 1. Log into Facebook in your browser
# 2. Open https://www.facebook.com/Aneejus/photos
# 3. Save photos to: d:\Sujeena\facebook-import\
# 4. Run: .\import-facebook-photos.ps1

$source = Join-Path $PSScriptRoot "facebook-import"
$dest   = Join-Path $PSScriptRoot "gallery"

if (-not (Test-Path $source)) {
    New-Item -ItemType Directory -Path $source | Out-Null
    Write-Host "Created $source — add your downloaded Facebook photos there, then run this script again."
    exit 0
}

$ext = @(".jpg", ".jpeg", ".png", ".gif", ".webp", ".JPG", ".JPEG", ".PNG")
$files = Get-ChildItem $source -File | Where-Object { $ext -contains $_.Extension }

if ($files.Count -eq 0) {
    Write-Host "No images in $source"
    Write-Host "Save photos from Facebook into that folder, then run this script again."
    exit 0
}

if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest | Out-Null }

$copied = 0
foreach ($f in $files) {
    $target = Join-Path $dest $f.Name
    if (Test-Path $target) {
        $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
        $target = Join-Path $dest ("{0}-{1}{2}" -f $base, (Get-Date -Format "yyyyMMddHHmmss"), $f.Extension)
    }
    Copy-Item $f.FullName $target
    $copied++
    Write-Host "Copied: $($f.Name)"
}

Write-Host "`nDone. $copied photo(s) added to gallery/. Restart or refresh http://localhost:3000 to see them."
