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

### Step 2: Configure Environment Variables
1. Navigate to the `bot/` folder in your project.
2. Create a new file named `.env` in this directory:
   ```bash
   c:\Users\NumLOW\web_version\bot\.env
   ```
3. Paste your Telegram Bot Token inside it:
   ```env
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
   ```

### Step 3: Install & Start the Bot
1. Open a terminal or PowerShell in the `bot/` directory:
   ```powershell
   cd c:\Users\NumLOW\web_version\bot
   ```
2. Install the lightweight dependencies:
   ```powershell
   npm install
   ```
3. Run the bot:
   ```powershell
   node index.js
   ```
4. *Success!* You should see in the console:
   ```
   [SYS] Loaded 6 weapon systems from weapons.json.
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
* **`/save [name] [grid] [Alt]`** — Save coordinates to preset library.
  * *Example: `/save main_depot 016073 80`*
* **`/presets`** — List all saved landmarks.
* **`/calc [gun_grid] [target_grid] [gun_alt] [target_alt]`** — Rapid one-off calculation.
  * *Example: `/calc 024036 028045 120 150`*
