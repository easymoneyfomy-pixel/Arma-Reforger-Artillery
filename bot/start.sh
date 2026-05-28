#!/usr/bin/env bash
# start.sh - Cross-platform start script for the Telegram FDC Bot
# Works on macOS, Linux, and Git Bash (Windows)

set -e  # Exit on any error

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "=== Starting Telegram FDC Bot ==="
echo "Working directory: $SCRIPT_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js (>=14) and try again."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found."
    echo "Please create a .env file with at least TELEGRAM_BOT_TOKEN."
    echo "You can copy from .env.example if available."
    # Optionally, exit or continue? We'll continue and let the bot handle missing token.
fi

# Start the bot
echo "Starting bot..."
node index.js

# If the bot exits, we can optionally restart it
# Uncomment the following lines for auto-restart:
# while true; do
#     echo "Bot crashed or stopped. Restarting in 5 seconds..."
#     sleep 5
#     node index.js
# done