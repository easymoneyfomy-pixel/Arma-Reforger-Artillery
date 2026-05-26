# 🤖 Telegram Artillery FDC License Bot

This is a lightweight **License & Access Manager Bot** for the **Arma Reforger Artillery Calculator**. It controls who can access the premium tactical Web-HUD interface directly inside Telegram.

The bot does NOT perform any calculations itself — all ballistic computation happens in the [Web-HUD](https://easymoneyfomy-pixel.github.io/Arma-Reforger-Artillery/), which is embedded as a Telegram Mini App.

---

## 🎯 How It Works

1. A user finds your bot (`@Arma_Artillery_Bot`) and presses `/start`.
2. If the user is **NOT whitelisted**, they see a "Access Denied" message with their Telegram ID and instructions to contact you.
3. You (the Admin) use `/allow [ID]` to grant them access.
4. Once whitelisted, the user gets a **💻 FDC ВЕБ-HUD** button in the bottom-left corner of the chat. Tapping it opens the full artillery calculator web app natively inside Telegram.
5. If you want to revoke access, use `/block [ID]`.

---

## ⚡ Quick Start

### Option A: Double-Click `start_bot.bat`
- Simply double-click `start_bot.bat` in Windows Explorer.
- The script checks Node.js, installs dependencies, handles `.env`, and runs with auto-restart.

### Option B: Right-Click `start_bot.ps1` → "Run with PowerShell"
- Same features as batch, plus colored logs, ASCII art, and interactive token prompt.

### Option C: Manual
```powershell
cd bot
npm install
node index.js
```

---

## 🛠️ First-Time Setup

### Step 1: Create a Bot via `@BotFather`
1. Open Telegram → search `@BotFather` → `/newbot`
2. Set a name and username (e.g. `Arma_Artillery_Bot`)
3. Copy the **HTTP API Token**

### Step 2: Configure BotFather Mini App (Optional but Recommended)
1. Go to `@BotFather` → select your bot → **Bot Settings** → **Menu Button**
2. Set URL: `https://easymoneyfomy-pixel.github.io/Arma-Reforger-Artillery/`
3. Set Title: `💻 FDC ВЕБ-HUD`
4. Go to **Main App** → Set URL to the same link → Choose **Fullsize** or **Fullscreen**

### Step 3: Run the Bot
1. Double-click `start_bot.bat` or run `node index.js`
2. Open Telegram, go to your bot, and press `/start`
3. The first user to `/start` becomes the **Admin** automatically

## 📖 Admin Commands

| Command | Description |
|---------|-------------|
| `/allow [ID]` | Grant a user access to the Web-HUD. Also supports clicking directly on `/allow_[ID]`. |
| `/block [ID]` | Revoke a user's access. Also supports clicking directly on `/block_[ID]`. |
| `/whitelist` | Show all authorized users with quick `/block_[ID]` clickable shortcuts. |
| `/broadcast [сообщение]` | Send a broadcast announcement to all authorized users (squad members). |

### ⚡ Interactive Access Requests
When a non-whitelisted user sends `/start` to the bot:
1. They see their Telegram ID and instructions to wait for authorization.
2. The **Admin** receives an instant notification with the user's name, username, and ID.
3. The Admin can approve or deny the request in **one click** using the inline `[✅ Разрешить]` and `[❌ Заблокировать]` buttons or by tapping the clickable links in `/whitelist`.

> Regular users see NO commands. They only see the access status and the Web-HUD button (if whitelisted).

---

## 🔒 Security

- Bot token is stored in `.env` (gitignored, never pushed to GitHub)
- Admin ID auto-bootstraps on first `/start`
- Whitelist is persisted in `.env` and survives restarts
- Non-whitelisted users cannot open the Web-HUD menu button

---

## 📦 Portability

The `bot/` folder is fully portable:
1. Copy the entire folder to any machine with Node.js
2. Double-click `start_bot.bat`
3. Enter your bot token if prompted
4. Done!

---

## ❓ FAQ

**Q: Does the bot need to run 24/7?**
A: The bot runs on YOUR computer. If you turn off the PC, the bot stops. To run 24/7, deploy to a VPS server.

**Q: What happens if a non-whitelisted user messages the bot?**
A: They see a "Access Denied" message with their Telegram ID, which they can send to you for authorization.

**Q: Where do the calculations happen?**
A: All ballistic calculations happen in the Web-HUD (the website). The bot only manages access permissions.
