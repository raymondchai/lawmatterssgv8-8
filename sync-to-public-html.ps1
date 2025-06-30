# Sync dist folder to public_html for Hostinger deployment
# This script ensures all files are properly synchronized

Write-Host "Syncing dist folder to public_html..." -ForegroundColor Green

# Remove all existing files in public_html (except .htaccess if it exists)
if (Test-Path "public_html") {
    Write-Host "Clearing existing public_html directory..." -ForegroundColor Yellow

    # Backup .htaccess if it exists
    $htaccessBackup = $null
    if (Test-Path "public_html/.htaccess") {
        $htaccessBackup = Get-Content "public_html/.htaccess" -Raw
        Write-Host "Backing up .htaccess file..." -ForegroundColor Blue
    }

    # Remove all files and folders
    Remove-Item "public_html/*" -Recurse -Force -ErrorAction SilentlyContinue

    # Restore .htaccess if it existed
    if ($htaccessBackup) {
        $htaccessBackup | Out-File "public_html/.htaccess" -Encoding UTF8
        Write-Host "Restored .htaccess file" -ForegroundColor Green
    }
} else {
    New-Item -ItemType Directory -Path "public_html" -Force
}

# Copy all files from dist to public_html
Write-Host "Copying files from dist to public_html..." -ForegroundColor Yellow
Copy-Item "dist/*" -Destination "public_html/" -Recurse -Force

# Verify the sync
Write-Host "Verifying sync..." -ForegroundColor Blue

$distFiles = Get-ChildItem "dist" -Recurse -File | Measure-Object
$publicFiles = Get-ChildItem "public_html" -Recurse -File | Measure-Object

Write-Host "Dist folder: $($distFiles.Count) files" -ForegroundColor Cyan
Write-Host "Public_html folder: $($publicFiles.Count) files" -ForegroundColor Cyan

# Check if index.html exists and show first few lines
if (Test-Path "public_html/index.html") {
    Write-Host "index.html exists in public_html" -ForegroundColor Green
    $indexContent = Get-Content "public_html/index.html" -TotalCount 5
    Write-Host "First 5 lines of index.html:" -ForegroundColor Blue
    $indexContent | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} else {
    Write-Host "index.html NOT found in public_html!" -ForegroundColor Red
}

# Check if assets folder exists
if (Test-Path "public_html/assets") {
    $assetCount = (Get-ChildItem "public_html/assets" -File).Count
    Write-Host "Assets folder exists with $assetCount files" -ForegroundColor Green
} else {
    Write-Host "Assets folder NOT found in public_html!" -ForegroundColor Red
}

Write-Host "Sync completed! You can now upload the public_html folder to Hostinger." -ForegroundColor Green
Write-Host "Make sure to upload ALL files in public_html/ to your Hostinger public_html/ directory." -ForegroundColor Yellow
