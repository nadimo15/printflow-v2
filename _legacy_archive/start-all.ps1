# PrintFlow V2 - Startup Script
# This script starts all three services

Write-Host "🚀 Starting PrintFlow V2..." -ForegroundColor Green

# Function to start a service in a new window
function Start-ServiceWindow {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Command
    )
    Write-Host "Starting $Name..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Path'; Write-Host '[$Name] Starting...' -ForegroundColor Green; $Command" -WindowStyle Normal
}

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start Backend
Start-ServiceWindow -Name "Backend API" -Path "$ScriptDir\backend" -Command "npm run dev"

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Start Storefront
Start-ServiceWindow -Name "Storefront" -Path "$ScriptDir\frontend-store" -Command "npm run dev"

# Wait a moment
Start-Sleep -Seconds 2

# Start ERP
Start-ServiceWindow -Name "ERP Dashboard" -Path "$ScriptDir\frontend-erp" -Command "npm run dev"

Write-Host ""
Write-Host "✅ All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Storefront: http://localhost:3000"
Write-Host "🔧 ERP:          http://localhost:3001"
Write-Host "⚙️  Backend API: http://localhost:5000"
Write-Host ""
Write-Host "Press any key to close this window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
