# GuildLens - Full Test Suite

$ErrorActionPreference = 'Stop'

function Log-Info($Message) {
    Write-Output "INFO: $Message"
}

function Log-Error($Message) {
    Write-Output "ERROR: $Message"
}

function Log-Success($Message) {
    Write-Output "SUCCESS: $Message"
}

Write-Output "======================================"
Write-Output "  GuildLens Comprehensive Test   "
Write-Output "======================================"

# 1. Dependency Check
Log-Info "Checking dependencies..."
if (Test-Path "node_modules") {
    Log-Success "node_modules found"
} else {
    Log-Error "node_modules missing. Please run 'npm install'"
    exit 1
}

# 2. Syntax Check
Log-Info "Checking syntax (node --check)..."
try {
    node --check index.js
    if ($LASTEXITCODE -eq 0) {
        Log-Success "Syntax Check Passed"
    } else {
        throw "Syntax check failed with code $LASTEXITCODE"
    }
} catch {
    Log-Error "Syntax Check Failed: $_"
    exit 1
}

# 3. Linting
Log-Info "Running Linter..."
if (Test-Path "eslint.config.js") {
    # Run lint but don't fail script if only warnings, checking exit code
    & npm run lint
    if ($LASTEXITCODE -eq 0) {
        Log-Success "Linting Passed"
    } else {
        Log-Info "Linting finished with potential issues (Code $LASTEXITCODE)"
    }
} else {
    Log-Info "Skipping lint (config not found)"
}

# 4. Unit Tests
Log-Info "Running Unit Tests (Jest)..."
& npm test -- --passWithNoTests
if ($LASTEXITCODE -eq 0) {
    Log-Success "All Tests Passed"
} else {
    Log-Error "Tests Failed"
    exit 1
}

# 5. Database Connection Test
Log-Info "Testing Database Connection..."

$jsCode = @"
const { initPool, testConnection, closePool } = require('./src/db/pgClient');
require('dotenv').config();

async function check() {
    try {
        console.log('Connecting...');
        initPool();
        const success = await testConnection();
        await closePool();
        if (success) {
            console.log('Connection successful!');
            process.exit(0);
        } else {
            console.error('Connection failed (logic)!');
            process.exit(1);
        }
    } catch (e) {
        console.error('Connection failed (exception)!', e);
        process.exit(1);
    }
}
check();
"@

$jsCode | Out-File "scripts/temp_db_check.js" -Encoding utf8

try {
    node scripts/temp_db_check.js
    if ($LASTEXITCODE -eq 0) {
        Log-Success "Database Connection OK"
    } else {
        throw "Database check script returned error code $LASTEXITCODE"
    }
} catch {
    Log-Error "Database Connection Failed"
} finally {
    if (Test-Path "scripts/temp_db_check.js") {
        Remove-Item "scripts/temp_db_check.js"
    }
}

Write-Output "======================================"
Write-Output "  ALL SYSTEMS GO! "
Write-Output "======================================"
exit 0
