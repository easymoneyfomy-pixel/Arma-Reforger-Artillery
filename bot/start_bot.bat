@echo off
title FDC BOT TERMINAL v1.3
color 0A
cls

echo =======================================================================
echo          FDC TACTICAL TELEMETRY TERMINAL - TELEGRAM BOT BOOTSTRAP
echo =======================================================================
echo [SYS] Initializing system checks...

:: Check Node.js installation
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERR] Node.js is NOT installed on this computer!
    echo [SYS] Please download and install Node.js from: https://nodejs.org/
    echo [SYS] Press any key to exit...
    pause >nul
    exit
)

echo [SYS] Node.js environment detected.

:: Check bot directory and dependencies
if not exist "package.json" (
    echo [ERR] package.json not found! Make sure this script is in the bot directory.
    pause
    exit
)

if not exist "node_modules\" (
    echo [SYS] Dependency folder 'node_modules' is missing. 
    echo [SYS] Running 'npm install' to fetch required libraries...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERR] Failed to install dependencies. Check your internet connection.
        pause
        exit
    )
    echo [SYS] Dependencies successfully installed.
)

:: Check for .env file
if not exist ".env" (
    echo [WARN] Configuration file '.env' is missing!
    echo [SYS] Generating default template '.env' file...
    echo TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN_HERE > .env
    echo ADMIN_ID= >> .env
    echo ALLOWED_USERS= >> .env
    echo [SYS] Template created. Please open the '.env' file in this folder and 
    echo       paste your Telegram Bot Token.
    echo [SYS] Press any key to open the folder and exit...
    explorer .
    exit
)

echo [SYS] Environment configuration loaded.
echo [SYS] Launching Fire Direction Control Bot...
echo -----------------------------------------------------------------------
echo [FDC] Terminal log stream active:
echo -----------------------------------------------------------------------

:run
node index.js
echo -----------------------------------------------------------------------
echo [WARN] Bot process terminated! Auto-restarting in 5 seconds...
echo [SYS] Press Ctrl+C to cancel auto-restart.
timeout /t 5
goto run
