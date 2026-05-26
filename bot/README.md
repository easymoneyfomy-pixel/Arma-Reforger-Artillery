# 🤖 Telegram Artillery FDC Admin Bot

This is a premium, portable **Fire Direction Control (FDC) Artillery Calculator Telegram Bot** for **Arma Reforger**. It runs directly on Node.js and integrates all the exact same ballistics, coordinate grid parsing, and impact correction calculations as your web application.

With this bot, you can have a highly interactive, fast, and feature-rich artillery computer right on your phone, inside overlay chats, or shared in your team's tactical group chat!

---

## 🎯 Bot Features

1. **Active Gun Tracking**: Save your player coordinates (`/setgun`).
2. **Interactive Selection**: Tap inline keyboard buttons to choose weapons (M252, Podnos, M120, D-30, M777, etc.) and charges.
3. **Fire Calculations**: Enter grid targets (`/fire 028045`) to get Azimuth, Elevation, Time of Flight, and formatted radio comms commands.
4. **Spotter Impact Corrections**: Type in where a shell actually landed (`/correct 027044`) to compute range/lateral deviations, target aim offsets, and mirror correction solutions (`/mirror`).
5. **Preset Landmarks**: Save key map coordinates (`/save grid_target 016073`) and query them on the fly.
6. **Quick Calculates**: Perform direct calculators between two points (`/calc`) without altering your active profile.
7. **Persistent State Storage**: Automatically saves all active guns, customized presets, and whitelists to `bot_db.json`. Your data survives restarts!
8. **Mission History Tracking**: Tracks your last 10 calculations (`/history`).
9. **One-Click Windows Launchers**: Easily run the bot anywhere using standard Batch or interactive PowerShell scripts.

---

## ⚡ Quick Start: One-Click Launchers

This bot folder is fully **portable**. You can copy the `bot/` folder to any other computer running Node.js and run it instantly.

### Option A: Double-Click `start_bot.bat` (Batch)
- Simply double-click `start_bot.bat` in Windows Explorer.
- The script checks if Node.js is installed.
- If dependencies are missing, it runs `npm install` automatically.
- If `.env` configuration file is missing, it auto-generates a template and opens the directory.
- Runs the bot in a terminal loop with **auto-restart on crash**.

### Option B: Right-Click `start_bot.ps1` -> "Run with PowerShell"
- Includes the same features as the batch launcher, plus:
  - Custom visual FDC console logo and colored log levels (`[OK]`, `[SYS]`, `[WARN]`, `[ERR]`, `[SEC]`).
  - Interactive token prompt: If `.env` is missing, you can paste your token directly into the terminal, and it writes the config for you.
  - Session tracker.

---

## 🛠️ Step-by-Step Installation Guide

### Step 1: Create a Bot via `@BotFather`
1. Open your Telegram client and search for the official [@BotFather](https://t.me/BotFather).
2. Start a chat and send the command:
   ```
   /newbot
   ```
3. Enter a friendly name for your bot (e.g. `My Reforger FDC Bot`).
4. Enter a unique username ending with `_bot` (e.g. `reforger_fdc_admin_bot`).
5. Copy the **HTTP API Access Token** provided by BotFather (it looks like `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).

### Step 2: Run with Launchers
1. Just double-click `start_bot.bat` or run `start_bot.ps1`.
2. Enter your Bot HTTP token if prompted.
3. *Success!* You should see in the console:
   ```
   [SYS] Loaded 6 weapon systems from weapons.json.
   [SYS] Loaded user states from persistent DB.
   [SYS] Telegram bot FDC listener is ACTIVE. Polling for inputs...
   ```

---

## 📖 Command Checklist Reference

* **`/start`** — Re-verify system profile and list quick-commands.
* **`/help`** — Show complete command syntax and coordinate formats.
* **`/setgun [grid/X Y] [Alt]`** — Set player gun position.
  * *Example: `/setgun 024036 120`*
* **`/weapon`** — Inline buttons to select weapon systems (M252, Podnos, Howitzers).
* **`/charge`** — Select Charge level (defaults to optimal Auto-selection).
* **`/fire [grid/X Y/landmark] [Alt]`** — Calculate solution to target.
  * *Example: `/fire 028045 150`*
* **`/correct [grid/X Y] [Alt]`** — Spotter feedback on observed shell impact.
  * *Example: `/correct 027044 140`*
* **`/mirror`** — Calculate solution for the corrected target offset.
* **`/distance [grid1/landmark] [grid2/landmark]`** — Calculate distance, azimuth, slope, and elevation delta between two coordinates.
* **`/save [name] [grid] [Alt]`** — Save coordinates to preset library.
  * *Example: `/save main_depot 016073 80`*
* **`/presets`** — List all saved landmarks.
* **`/delete [name]`** — Remove saved landmark preset.
* **`/export`** — Generate copy-pasteable `/save` commands to share presets.
* **`/history`** — View the last 10 firing solutions.
* **`/info`** — System telemetry, system uptime, and User ID security level.
* **`/about`** — Project information and Web-HUD links.
* **`/calc [gun_grid] [target_grid] [gun_alt] [target_alt]`** — Rapid one-off calculation.
  * *Example: `/calc 024036 028045 120 150`*
