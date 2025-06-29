# Deploy LawMattersSG to Hostinger
# This script copies the built files to the public_html directory

Write-Host "🚀 Starting deployment to Hostinger..." -ForegroundColor Green

# Define paths
$distPath = ".\dist"
$deployPath = "C:\Users\Raymond\Desktop\public_html"

# Check if dist folder exists
if (-not (Test-Path $distPath)) {
    Write-Host "❌ Error: dist folder not found. Please run 'npm run build' first." -ForegroundColor Red
    exit 1
}

# Create deploy directory if it doesn't exist
if (-not (Test-Path $deployPath)) {
    Write-Host "📁 Creating deployment directory: $deployPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $deployPath -Force
}

# Clear existing files in deployment directory
Write-Host "🧹 Clearing existing files in deployment directory..." -ForegroundColor Yellow
Get-ChildItem -Path $deployPath -Recurse | Remove-Item -Force -Recurse

# Copy all files from dist to deployment directory
Write-Host "📋 Copying files from $distPath to $deployPath..." -ForegroundColor Yellow
Copy-Item -Path "$distPath\*" -Destination $deployPath -Recurse -Force

# List copied files
Write-Host "✅ Files copied successfully:" -ForegroundColor Green
Get-ChildItem -Path $deployPath -Recurse | ForEach-Object {
    Write-Host "   $($_.FullName.Replace($deployPath, ''))" -ForegroundColor Cyan
}

Write-Host "🎉 Deployment complete! Files are ready to upload to Hostinger public_html directory." -ForegroundColor Green
Write-Host "📁 Files location: $deployPath" -ForegroundColor Yellow
Write-Host "🌐 After uploading, test at: https://craftchatbot.com" -ForegroundColor Yellow
