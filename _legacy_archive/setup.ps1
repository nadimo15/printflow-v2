# PrintFlow V2 - Setup Script
# Run this script to set up the entire project

Write-Host "🚀 PrintFlow V2 Setup" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Install Backend Dependencies
Write-Host ""
Write-Host "📦 Installing Backend dependencies..." -ForegroundColor Cyan
cd "$ScriptDir\backend"
npm install

# Install Storefront Dependencies
Write-Host ""
Write-Host "🎨 Installing Storefront dependencies..." -ForegroundColor Cyan
cd "$ScriptDir\frontend-store"
npm install

# Install ERP Dependencies
Write-Host ""
Write-Host "🔧 Installing ERP dependencies..." -ForegroundColor Cyan
cd "$ScriptDir\frontend-erp"
npm install

# Create .env files if they don't exist
Write-Host ""
Write-Host "📝 Creating environment files..." -ForegroundColor Cyan

$backendEnv = @"
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=printflow_v2
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
"@

$storefrontEnv = @"
VITE_API_URL=http://localhost:5000/api
"@

$erpEnv = @"
VITE_API_URL=http://localhost:5000/api
"@

if (-not (Test-Path "$ScriptDir\backend\.env")) {
    $backendEnv | Out-File -FilePath "$ScriptDir\backend\.env" -Encoding UTF8
    Write-Host "  ✅ Backend .env created" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Backend .env already exists" -ForegroundColor Yellow
}

if (-not (Test-Path "$ScriptDir\frontend-store\.env")) {
    $storefrontEnv | Out-File -FilePath "$ScriptDir\frontend-store\.env" -Encoding UTF8
    Write-Host "  ✅ Storefront .env created" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Storefront .env already exists" -ForegroundColor Yellow
}

if (-not (Test-Path "$ScriptDir\frontend-erp\.env")) {
    $erpEnv | Out-File -FilePath "$ScriptDir\frontend-erp\.env" -Encoding UTF8
    Write-Host "  ✅ ERP .env created" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  ERP .env already exists" -ForegroundColor Yellow
}

# Create database setup script
Write-Host ""
Write-Host "🗄️  Database Setup Instructions:" -ForegroundColor Cyan
Write-Host "  1. Make sure PostgreSQL is installed and running"
Write-Host "  2. Create a database named 'printflow_v2':"
Write-Host "     createdb printflow_v2"
Write-Host "  3. Update database credentials in backend/.env"
Write-Host "  4. Run: cd backend && npm run db:sync"

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Set up PostgreSQL database"
Write-Host "  2. Run: .\start-all.ps1"
Write-Host ""
Write-Host "📖 For more info, see README.md"
Write-Host ""

Read-Host "Press Enter to exit"
