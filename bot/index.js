const fs = require("fs");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

// ============================================================================
// 1. Access Whitelist and Configuration
// ============================================================================
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("[ERR] TELEGRAM_BOT_TOKEN is not defined in your environment or .env file!");
  process.exit(1);
}

const webAppUrl = "https://easymoneyfomy-pixel.github.io/Arma-Reforger-Artillery/";

function getAdminId() {
  return process.env.ADMIN_ID ? Number(process.env.ADMIN_ID) : null;
}

function getAllowedUsers() {
  const adminId = getAdminId();
  const allowed = new Set(
    (process.env.ALLOWED_USERS || "")
      .split(",")
      .map(id => Number(id.trim()))
      .filter(Boolean)
  );
  if (adminId) allowed.add(adminId);
  return allowed;
}

function updateEnvWhitelist(adminId, allowedSet) {
  const envPath = path.join(__dirname, ".env");
  const array = Array.from(allowedSet);
  const content = `TELEGRAM_BOT_TOKEN=${token}\nADMIN_ID=${adminId}\nALLOWED_USERS=${array.join(",")}\n`;
  fs.writeFileSync(envPath, content);
  
  // Update in current process
  process.env.ADMIN_ID = adminId.toString();
  process.env.ALLOWED_USERS = array.join(",");
}

// Set up the menu button for a user based on their access
function configureUserMenuButton(userId, isAllowed) {
  if (isAllowed) {
    bot.setChatMenuButton({
      chat_id: userId,
      menu_button: {
        type: "web_app",
        text: "💻 FDC ВЕБ-HUD",
        web_app: {
          url: webAppUrl
        }
      }
    }).catch((err) => {
      console.error(`[ERR] Failed to set WebApp menu button for user ${userId}:`, err.message);
    });
  } else {
    bot.setChatMenuButton({
      chat_id: userId,
      menu_button: {
        type: "default"
      }
    }).catch((err) => {
      console.error(`[ERR] Failed to reset WebApp menu button for user ${userId}:`, err.message);
    });
  }
}

// ============================================================================
// 2. Bot Initialization
// ============================================================================
const bot = new TelegramBot(token, { polling: true });
console.log("[SYS] Telegram License FDC bot is ACTIVE. Polling for inputs...");

// Disable global menu button so standard users don't see it by default
bot.setChatMenuButton({
  menu_button: {
    type: "default"
  }
}).then(() => {
  console.log("[SYS] Global default menu button reset successfully.");
}).catch((err) => {
  console.error("[ERR] Failed to reset global menu button:", err.message);
});

// ============================================================================
// 3. Bot Core Handlers
// ============================================================================

// Command: /start
bot.onText(/\/start/, (msg) => {
  const userId = msg.from.id;
  const adminId = getAdminId();

  // 1. Auto-bootstrap the first user who starts the bot as Admin
  if (!adminId) {
    console.log(`[SEC] Bootstrapping Admin settings for User ID: ${userId}`);
    const allowed = new Set([userId]);
    updateEnvWhitelist(userId, allowed);
    configureUserMenuButton(userId, true);
    
    const welcomeText = `👑 <b>СИСТЕМА FDC ИНИЦИАЛИЗИРОВАНА!</b>\n───────────────────\nВы зарегистрированы как главный Администратор.\n\nИспользуйте:\n• <code>/allow [ID]</code> — разрешить доступ игроку\n• <code>/block [ID]</code> — заблокировать игрока\n• <code>/whitelist</code> — список авторизованных стрелков\n\nВеб-интерфейс готов и доступен по кнопке в левом нижнем углу!`;
    bot.sendMessage(userId, welcomeText, { parse_mode: "HTML" });
    return;
  }

  const allowed = getAllowedUsers();
  const isAllowed = (userId === adminId || allowed.has(userId));

  if (isAllowed) {
    configureUserMenuButton(userId, true);
    const text = `🎯 <b>ДОСТУП АКТИВИРОВАН</b>\n───────────────────\nДобро пожаловать в тактический вычислитель артиллерии.\n\nВеб-HUD готов к работе! Для открытия нажмите на кнопку <b>💻 FDC ВЕБ-HUD</b> в левом нижнем углу чата.`;
    bot.sendMessage(userId, text, { parse_mode: "HTML" });
  } else {
    configureUserMenuButton(userId, false);
    const text = `🔴 <b>ДОСТУП ОГРАНИЧЕН (SEC_GUARD_ALERT)</b>\n───────────────────\nДля использования тактического артиллерийского веб-калькулятора требуется авторизация.\n\n👤 Твой Telegram ID: <code>${userId}</code>\n\nОтправь этот ID администратору для получения доступа к вычислителю.`;
    bot.sendMessage(userId, text, { parse_mode: "HTML" });
  }
});

// Command: /allow (Admin Only)
bot.onText(/\/allow(?:\s+(.+))?/, (msg, match) => {
  const userId = msg.from.id;
  const adminId = getAdminId();

  if (userId !== adminId) return; // Ignore if not admin

  const args = match[1];
  if (!args) {
    return bot.sendMessage(userId, `⚠️ <b>Пример использования:</b>\n<code>/allow 123456789</code>`, { parse_mode: "HTML" });
  }

  const targetId = Number(args.trim());
  if (!targetId || isNaN(targetId)) {
    return bot.sendMessage(userId, `❌ <b>Неверный ID пользователя!</b>`, { parse_mode: "HTML" });
  }

  const allowed = getAllowedUsers();
  allowed.add(targetId);
  updateEnvWhitelist(adminId, allowed);

  // Set the user's WebApp menu button to active
  configureUserMenuButton(targetId, true);

  bot.sendMessage(userId, `✅ <b>ДОСТУП ПРЕДОСТАВЛЕН!</b>\nСтрелок <code>${targetId}</code> успешно добавлен в базу данных.\nДля него активирован веб-интерфейс.`, { parse_mode: "HTML" });

  // Notify the user directly
  bot.sendMessage(targetId, `🟢 <b>ДОСТУП РАЗРЕШЕН!</b>\nАдминистратор одобрил твою лицензию.\n\nУ тебя появилась кнопка <b>💻 FDC ВЕБ-HUD</b> в левом нижнем углу чата. Нажми на нее для запуска тактического калькулятора!`, { parse_mode: "HTML" })
    .catch(() => {});
});

// Command: /block (Admin Only)
bot.onText(/\/block(?:\s+(.+))?/, (msg, match) => {
  const userId = msg.from.id;
  const adminId = getAdminId();

  if (userId !== adminId) return; // Ignore if not admin

  const args = match[1];
  if (!args) {
    return bot.sendMessage(userId, `⚠️ <b>Пример использования:</b>\n<code>/block 123456789</code>`, { parse_mode: "HTML" });
  }

  const targetId = Number(args.trim());
  if (targetId === adminId) {
    return bot.sendMessage(userId, `❌ <b>Вы не можете заблокировать самого себя!</b>`, { parse_mode: "HTML" });
  }

  const allowed = getAllowedUsers();
  allowed.delete(targetId);
  updateEnvWhitelist(adminId, allowed);

  // Disable the user's WebApp menu button
  configureUserMenuButton(targetId, false);

  bot.sendMessage(userId, `❌ <b>ДОСТУП АННУЛИРОВАН!</b>\nПользователь <code>${targetId}</code> удален из системы доступа.`, { parse_mode: "HTML" });

  // Notify the user directly
  bot.sendMessage(targetId, `🔴 <b>ДОСТУП ПРИОСТАНОВЛЕН!</b>\nТвоя авторизация была аннулирована администратором.`, { parse_mode: "HTML" })
    .catch(() => {});
});

// Command: /whitelist (Admin Only)
bot.onText(/\/whitelist/, (msg) => {
  const userId = msg.from.id;
  const adminId = getAdminId();

  if (userId !== adminId) return; // Ignore if not admin

  const allowed = getAllowedUsers();
  let text = `🔒 <b>СПИСОК АВТОРИЗОВАННЫХ ПОЛЬЗОВАТЕЛЕЙ:</b>\n\n`;
  allowed.forEach(id => {
    text += `• <code>${id}</code> ${id === adminId ? "👑 [Администратор]" : "🔫 [Снайпер]"}\n`;
  });

  bot.sendMessage(userId, text, { parse_mode: "HTML" });
});

// Handle non-command text inputs to check access and guide users
bot.on("message", (msg) => {
  const text = msg.text || "";
  if (text.startsWith("/")) return; // Handled by specific command commands

  const userId = msg.from.id;
  const adminId = getAdminId();
  if (!adminId) return; // System not set up yet

  const allowed = getAllowedUsers();
  const isAllowed = (userId === adminId || allowed.has(userId));

  if (isAllowed) {
    configureUserMenuButton(userId, true);
    bot.sendMessage(userId, `ℹ️ Нажми на кнопку <b>💻 FDC ВЕБ-HUD</b> в нижнем левом углу, чтобы запустить графический калькулятор.`, { parse_mode: "HTML" });
  } else {
    configureUserMenuButton(userId, false);
    bot.sendMessage(userId, `🔴 <b>ДОСТУП ОГРАНИЧЕН (SEC_GUARD_ALERT)</b>\n───────────────────\nДля использования тактического артиллерийского веб-калькулятора требуется авторизация.\n\n👤 Твой Telegram ID: <code>${userId}</code>\n\nОтправь этот ID администратору для получения доступа к вычислителю.`, { parse_mode: "HTML" });
  }
});
