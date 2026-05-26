# ============================================================================
# FDC TACTICAL TELEMETRY TERMINAL - PowerShell Launcher
# Arma Reforger Artillery Telegram Bot v1.3
# ============================================================================

$Host.UI.RawUI.WindowTitle = "FDC BOT TERMINAL v1.3"

function Write-Logo {
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor DarkGreen
    Write-Host "  ║                                                      ║" -ForegroundColor DarkGreen
    Write-Host "  ║   ███████╗██████╗  ██████╗    ██████╗  ██████╗ ████████╗  ║" -ForegroundColor Green
    Write-Host "  ║   ██╔════╝██╔══██╗██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝  ║" -ForegroundColor Green
    Write-Host "  ║   █████╗  ██║  ██║██║         ██████╔╝██║   ██║   ██║     ║" -ForegroundColor Green
    Write-Host "  ║   ██╔══╝  ██║  ██║██║         ██╔══██╗██║   ██║   ██║     ║" -ForegroundColor Green
    Write-Host "  ║   ██║     ██████╔╝╚██████╗    ██████╔╝╚██████╔╝   ██║     ║" -ForegroundColor Green
    Write-Host "  ║   ╚═╝     ╚═════╝  ╚═════╝    ╚═════╝  ╚═════╝    ╚═╝     ║" -ForegroundColor Green
    Write-Host "  ║                                                      ║" -ForegroundColor DarkGreen
    Write-Host "  ║    FIRE DIRECTION CONTROL — TELEGRAM TACTICAL BOT    ║" -ForegroundColor Yellow
    Write-Host "  ║              Arma Reforger Artillery                  ║" -ForegroundColor DarkYellow
    Write-Host "  ║                                                      ║" -ForegroundColor DarkGreen
    Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor DarkGreen
    Write-Host ""
}

function Write-Status($msg, $type = "SYS") {
    $color = switch ($type) {
        "SYS"  { "Cyan" }
        "OK"   { "Green" }
        "WARN" { "Yellow" }
        "ERR"  { "Red" }
        "SEC"  { "Magenta" }
        default { "White" }
    }
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "  [$ts][$type] " -ForegroundColor DarkGray -NoNewline
    Write-Host $msg -ForegroundColor $color
}

# --- MAIN ---
Clear-Host
Write-Logo

# Navigate to the script's own directory (portable!)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir
Write-Status "Working directory: $scriptDir"

# 1. Check Node.js
try {
    $nodeVer = & node -v 2>&1
    Write-Status "Node.js $nodeVer detected." "OK"
} catch {
    Write-Status "Node.js is NOT installed!" "ERR"
    Write-Status "Download it from https://nodejs.org/ and restart." "ERR"
    Read-Host "Press Enter to exit"
    exit 1
}

# 2. Check package.json
if (-not (Test-Path "package.json")) {
    Write-Status "package.json not found! Ensure this script is inside the bot/ folder." "ERR"
    Read-Host "Press Enter to exit"
    exit 1
}

# 3. Install dependencies if missing
if (-not (Test-Path "node_modules")) {
    Write-Status "Dependencies not installed. Running npm install..." "WARN"
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Failed to install dependencies. Check internet connection." "ERR"
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Status "All dependencies installed successfully." "OK"
} else {
    Write-Status "Dependencies already installed." "OK"
}

# 4. Check .env config
if (-not (Test-Path ".env")) {
    Write-Status "Environment file .env is MISSING!" "WARN"
    $token = Read-Host "  Paste your Telegram Bot Token here"
    if ($token) {
        "TELEGRAM_BOT_TOKEN=$token`nADMIN_ID=`nALLOWED_USERS=" | Out-File -FilePath ".env" -Encoding utf8
        Write-Status ".env file created with your token." "OK"
    } else {
        Write-Status "No token provided. Creating template .env..." "WARN"
        "TELEGRAM_BOT_TOKEN=YOUR_TOKEN_HERE`nADMIN_ID=`nALLOWED_USERS=" | Out-File -FilePath ".env" -Encoding utf8
        Write-Status "Open .env and paste your Telegram bot token, then restart." "WARN"
        explorer.exe .
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# 5. Security check: warn if token is still placeholder
$envContent = Get-Content ".env" -Raw
if ($envContent -match "YOUR_TOKEN_HERE|YOUR_TELEGRAM_BOT_TOKEN_HERE") {
    Write-Status "Your .env file still contains a placeholder token!" "ERR"
    Write-Status "Open .env and replace the token with your real Telegram Bot Token." "ERR"
    explorer.exe .
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Status "Environment configuration loaded." "SEC"

# 6. Launch bot with auto-restart
Write-Host ""
Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGreen
Write-Host "   LAUNCHING FDC BOT... Press Ctrl+C to shut down." -ForegroundColor Green
Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGreen
Write-Host ""

$restartCount = 0

while ($true) {
    $restartCount++
    Write-Status "Bot session #$restartCount starting..." "SYS"
    
    & node index.js
    
    Write-Host ""
    Write-Status "Bot process stopped! (exit code: $LASTEXITCODE)" "WARN"
    Write-Status "Auto-restarting in 5 seconds... Press Ctrl+C to cancel." "WARN"
    Start-Sleep -Seconds 5
}
