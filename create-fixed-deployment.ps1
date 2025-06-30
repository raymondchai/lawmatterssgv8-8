# Create deployment package with synchronized files
# This creates a ZIP file ready for Hostinger upload

Write-Host "Creating deployment package..." -ForegroundColor Green

# Create timestamp for unique filename
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipName = "lawmatters-fixed-deployment-$timestamp.zip"

# Create the ZIP file
if (Test-Path $zipName) {
    Remove-Item $zipName -Force
}

Write-Host "Compressing public_html folder..." -ForegroundColor Yellow
Compress-Archive -Path "public_html/*" -DestinationPath $zipName -Force

# Verify the ZIP contents
Write-Host "Verifying ZIP contents..." -ForegroundColor Blue
$zipContents = Get-ChildItem $zipName
Write-Host "Created: $($zipContents.Name)" -ForegroundColor Green
Write-Host "Size: $([math]::Round($zipContents.Length / 1MB, 2)) MB" -ForegroundColor Cyan

# Show instructions
Write-Host "`n=== DEPLOYMENT INSTRUCTIONS ===" -ForegroundColor Magenta
Write-Host "1. Download the ZIP file: $zipName" -ForegroundColor White
Write-Host "2. Log into your Hostinger control panel" -ForegroundColor White
Write-Host "3. Go to File Manager" -ForegroundColor White
Write-Host "4. Navigate to public_html directory" -ForegroundColor White
Write-Host "5. DELETE ALL existing files in public_html" -ForegroundColor Red
Write-Host "6. Upload and extract the ZIP file" -ForegroundColor White
Write-Host "7. Test the website at https://craftchatbot.com" -ForegroundColor White
Write-Host "`nThis should fix the JavaScript errors!" -ForegroundColor Green
