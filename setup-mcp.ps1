# LawMatters MCP Server Setup Script
# This script sets up the MCP server for development productivity

Write-Host "🚀 Setting up LawMatters MCP Server..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Navigate to MCP server directory
Set-Location "mcp-server"

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "🔨 Building MCP server..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build MCP server" -ForegroundColor Red
    exit 1
}

# Go back to project root
Set-Location ".."

Write-Host "⚙️ Setting up Claude Desktop configuration..." -ForegroundColor Yellow

# Get the current directory path
$currentPath = (Get-Location).Path

# Update the Claude Desktop config with the correct path
$configContent = Get-Content "claude-desktop-config.json" -Raw
$configContent = $configContent -replace "C:/Webapp-Projects-1/lawmatterssgv8-8", $currentPath
Set-Content "claude-desktop-config.json" -Value $configContent

Write-Host "✅ MCP Server setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Copy the contents of 'claude-desktop-config.json' to your Claude Desktop configuration"
Write-Host "2. Restart Claude Desktop"
Write-Host "3. Test the MCP server with: 'Please run a project health check'"
Write-Host ""
Write-Host "🔧 Available Commands:" -ForegroundColor Cyan
Write-Host "- Analyze code quality: 'Please analyze the code quality of src/components/auth/LoginForm.tsx'"
Write-Host "- Generate component: 'Generate a new React component called DocumentViewer with tests'"
Write-Host "- Review code: 'Review the security of src/lib/supabase.ts'"
Write-Host "- Start monitoring: 'Start watching the project for changes'"
Write-Host "- Health check: 'Run a comprehensive project health check'"
Write-Host ""
Write-Host "📚 For more information, see mcp-server/README.md" -ForegroundColor Cyan
