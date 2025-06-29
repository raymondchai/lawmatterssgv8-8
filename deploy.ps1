# PowerShell deployment script for LawMattersSG
# Copies dist files to public_html for Hostinger deployment

Write-Host "🚀 Starting deployment to public_html..." -ForegroundColor Green

# Check if dist folder exists
if (-not (Test-Path "dist")) {
    Write-Host "❌ Error: dist folder not found. Please run 'npm run build' first." -ForegroundColor Red
    exit 1
}

# Create public_html directory if it doesn't exist
if (-not (Test-Path "public_html")) {
    New-Item -ItemType Directory -Path "public_html" -Force
    Write-Host "📁 Created public_html directory" -ForegroundColor Yellow
}

# Clear existing files in public_html (except .htaccess if it exists)
Write-Host "🧹 Clearing existing files..." -ForegroundColor Yellow
Get-ChildItem -Path "public_html" -Recurse | Where-Object { $_.Name -ne ".htaccess" } | Remove-Item -Force -Recurse

# Copy all files from dist to public_html
Write-Host "📋 Copying files from dist to public_html..." -ForegroundColor Yellow
Copy-Item -Path "dist\*" -Destination "public_html" -Recurse -Force

# Verify deployment
$fileCount = (Get-ChildItem -Path "public_html" -Recurse -File).Count
Write-Host "✅ Deployment complete! Copied $fileCount files to public_html" -ForegroundColor Green

# List key files
Write-Host "`n📄 Key files deployed:" -ForegroundColor Cyan
if (Test-Path "public_html\index.html") { Write-Host "  ✓ index.html" -ForegroundColor Green }
if (Test-Path "public_html\assets") { Write-Host "  ✓ assets folder" -ForegroundColor Green }
if (Test-Path "public_html\.htaccess") { Write-Host "  ✓ .htaccess" -ForegroundColor Green }

Write-Host "`n🌐 Your application is ready for upload to Hostinger!" -ForegroundColor Green
Write-Host "📁 Upload all files from the 'public_html' folder to your Hostinger public_html directory" -ForegroundColor Yellow
