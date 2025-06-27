# Create deployment package for LawMattersSG
Write-Host "Creating deployment package for craftchatbot.com..." -ForegroundColor Green

$distPath = ".\dist"
$zipPath = ".\lawmatters-craftchatbot-fixed.zip"

# Remove existing zip if it exists
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
    Write-Host "Removed existing deployment package" -ForegroundColor Yellow
}

# Create the zip file
try {
    Compress-Archive -Path "$distPath\*" -DestinationPath $zipPath -Force
    Write-Host "Deployment package created: $zipPath" -ForegroundColor Green

    # Show file size
    $fileSize = (Get-Item $zipPath).Length / 1MB
    Write-Host "Package size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan

    Write-Host "Ready for deployment!" -ForegroundColor Green
    Write-Host "Upload $zipPath to your hosting provider and extract it to the public_html directory." -ForegroundColor White
} catch {
    Write-Host "Failed to create deployment package: $_" -ForegroundColor Red
}
