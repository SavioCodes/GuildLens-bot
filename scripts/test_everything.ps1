# GuildLens - Full Test Suite
# Runs linting, testing, and connection checks

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  🚀 GuildLens Comprehensive Test   " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# 1. Dependency Check
Write-Host "`n📦 Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✅ node_modules found" -ForegroundColor Green
} else {
    Write-Host "❌ node_modules missing. Please run 'npm install'" -ForegroundColor Red
    exit 1
}

# 2. Syntax Check
Write-Host "`n🔍 Checking syntax..." -ForegroundColor Yellow
try {
    node --check index.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Syntax Check Passed" -ForegroundColor Green
    } else {
        Write-Host "❌ Syntax Error Detected" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to run syntax check" -ForegroundColor Red
}

# 3. Linting (if installed)
Write-Host "`n🧹 Running Linter (ESLint)..." -ForegroundColor Yellow
try {
    if (Test-Path "eslint.config.js") {
        npm run lint
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Linting Passed" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Linting Issues Found (Optional)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "ℹ️ ESLint config not found, skipping." -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️ Linter check failed or not installed" -ForegroundColor Yellow
}

# 4. Unit Tests
Write-Host "`n🧪 Running Unit Tests (Jest)..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ All Tests Passed" -ForegroundColor Green
} else {
    Write-Host "❌ Tests Failed" -ForegroundColor Red
    exit 1
}

# 5. Database Connection Test
Write-Host "`n🗄️ Testing Database Connection..." -ForegroundColor Yellow
# We'll run a small node script just to test connection
$testScript = @"
const { initPool, testConnection, closePool } = require('./src/db/pgClient');
require('dotenv').config();

async function check() {
    try {
        initPool();
        const success = await testConnection();
        await closePool();
        process.exit(success ? 0 : 1);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
"@

$testScript | Out-File "scripts/temp_db_check.js" -Encoding utf8
node scripts/temp_db_check.js
$dbExitCode = $LASTEXITCODE
Remove-Item "scripts/temp_db_check.js"

if ($dbExitCode -eq 0) {
    Write-Host "✅ Database Connection OK" -ForegroundColor Green
} else {
    Write-Host "❌ Database Connection Failed" -ForegroundColor Red
    Write-Host "   Check your .env file and Supabase status." -ForegroundColor Yellow
}

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "  🎉 All Systems Go! (Assuming ticks above) " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
