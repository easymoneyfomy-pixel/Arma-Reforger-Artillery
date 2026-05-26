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
    
    const welcomeText = `👑 <b>СИСТЕМА FDC ИНИЦИАЛИЗИРОВАНА!</b>\n───────────────────\nВы зарегистрированы как главный Администратор.\n\n<b>Доступные команды управления:</b>\n• <code>/allow [ID]</code> — разрешить доступ игроку\n• <code>/block [ID]</code> — заблокировать игрока\n• <code>/whitelist</code> — список авторизованных стрелков\n• <code>/broadcast [текст]</code> — отправить сообщение всем пользователям\n\nВеб-интерфейс готов и доступен по кнопке <b>💻 FDC ВЕБ-HUD</b> в левом нижнем углу!`;
    bot.sendMessage(userId, welcomeText, { parse_mode: "HTML" });
    return;
  }

  const allowed = getAllowedUsers();
  const isAllowed = (userId === adminId || allowed.has(userId));

  if (isAllowed) {
    configureUserMenuButton(userId, true);
    let text = `🎯 <b>ДОСТУП АКТИВИРОВАН</b>\n───────────────────\nДобро пожаловать в тактический вычислитель артиллерии.\n\nВеб-HUD готов к работе! Для открытия нажмите на кнопку <b>💻 FDC ВЕБ-HUD</b> в левом нижнем углу чата.`;
    
    if (userId === adminId) {
      text += `\n\n👑 <b>Панель управления:</b>\n• <code>/allow [ID]</code> — дать доступ\n• <code>/block [ID]</code> — забрать доступ\n• <code>/whitelist</code> — список стрелков\n• <code>/broadcast [текст]</code> — объявление для всех`;
    }
    bot.sendMessage(userId, text, { parse_mode: "HTML" });
  } else {
    configureUserMenuButton(userId, false);
    const text = `🔴 <b>ДОСТУП ОГРАНИЧЕН (SEC_GUARD_ALERT)</b>\n───────────────────\nДля использования тактического артиллерийского веб-калькулятора требуется авторизация.\n\n👤 Твой Telegram ID: <code>${userId}</code>\n\nОтправь этот ID администратору для получения доступа к вычислителю. Ваши данные отправлены админу на рассмотрение.`;
    bot.sendMessage(userId, text, { parse_mode: "HTML" });
    
    // Notify admin
    notifyAdminAccessRequest(msg.from, userId);
  }
});

// Helper: Notify Admin about access request
function notifyAdminAccessRequest(user, userId) {
  const adminId = getAdminId();
  if (!adminId || userId === adminId) return;

  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Без имени";
  const usernameText = user.username ? `@${user.username}` : "нет юзернейма";

  const messageText = `🛎️ <b>ЗАПРОС ДОСТУПА!</b>\n───────────────────\n👤 Игрок: <b>${name}</b>\n🗣️ Юзернейм: ${usernameText}\n🆔 ID: <code>${userId}</code>\n───────────────────\nВы можете разрешить или отклонить доступ прямо сейчас:`;
  
  bot.sendMessage(adminId, messageText, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Разрешить", callback_data: `allow_${userId}` },
          { text: "❌ Заблокировать", callback_data: `block_${userId}` }
        ]
      ]
    }
  }).catch((err) => {
    console.error(`[ERR] Failed to notify admin about access request for user ${userId}:`, err.message);
  });
}

// Command: /allow (Admin Only, supports /allow [ID] or /allow_[ID] for clickability)
bot.onText(/\/allow(?:_|\s+)(.+)/, (msg, match) => {
  const userId = msg.from.id;
  const adminId = getAdminId();

  if (userId !== adminId) return; // Ignore if not admin

  const args = match[1];
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

// Command: /block (Admin Only, supports /block [ID] or /block_[ID] for clickability)
bot.onText(/\/block(?:_|\s+)(.+)/, (msg, match) => {
  const userId = msg.from.id;
  const adminId = getAdminId();

  if (userId !== adminId) return; // Ignore if not admin

  const args = match[1];
  const targetId = Number(args.trim());
  if (targetId === adminId) {
    return bot.sendMessage(userId, `❌ <b>Вы не можете заблокировать самого себя!</b>`, { parse_mode: "HTML" });
  }

  if (!targetId || isNaN(targetId)) {
    return bot.sendMessage(userId, `❌ <b>Неверный ID пользователя!</b>`, { parse_mode: "HTML" });
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
    if (id === adminId) {
      text += `• <code>${id}</code> 👑 [Администратор]\n`;
    } else {
      text += `• <code>${id}</code> 🔫 [Снайпер] — /block_${id}\n`;
    }
  });

  bot.sendMessage(userId, text, { parse_mode: "HTML" });
});

// Command: /broadcast (Admin Only)
bot.onText(/\/broadcast(?:\s+(.+))?/, (msg, match) => {
  const userId = msg.from.id;
  const adminId = getAdminId();

  if (userId !== adminId) return; // Ignore if not admin

  const textToBroadcast = match[1];
  if (!textToBroadcast) {
    return bot.sendMessage(userId, `⚠️ <b>Пример использования:</b>\n<code>/broadcast Вышла новая версия калькулятора, обновитесь!</code>`, { parse_mode: "HTML" });
  }

  const allowed = getAllowedUsers();
  let successCount = 0;
  let failCount = 0;

  const targetIds = Array.from(allowed).filter(id => id !== adminId);
  if (targetIds.length === 0) {
    return bot.sendMessage(userId, `ℹ️ <b>Нет активных пользователей для рассылки.</b>`, { parse_mode: "HTML" });
  }

  const promises = targetIds.map(targetId => {
    return bot.sendMessage(targetId, `📢 <b>ОБЪЯВЛЕНИЕ ОТ АДМИНИСТРАТОРА:</b>\n───────────────────\n${textToBroadcast}`, { parse_mode: "HTML" })
      .then(() => { successCount++; })
      .catch((err) => { 
        console.error(`[ERR] Failed broadcast to ${targetId}:`, err.message);
        failCount++; 
      });
  });

  Promise.all(promises).then(() => {
    bot.sendMessage(userId, `📢 <b>Рассылка завершена!</b>\n───────────────────\n✅ Успешно отправлено: <b>${successCount}</b>\n❌ Не удалось отправить: <b>${failCount}</b>`, { parse_mode: "HTML" });
  });
});

// Inline Keyboard Button Callback Listener
bot.on("callback_query", (query) => {
  const userId = query.from.id;
  const adminId = getAdminId();

  if (userId !== adminId) {
    return bot.answerCallbackQuery(query.id, { text: "❌ Доступ запрещен!", show_alert: true });
  }

  const data = query.data;
  if (data.startsWith("allow_")) {
    const targetId = Number(data.split("_")[1]);
    if (isNaN(targetId)) return bot.answerCallbackQuery(query.id, { text: "Неверный ID" });

    const allowed = getAllowedUsers();
    allowed.add(targetId);
    updateEnvWhitelist(adminId, allowed);
    configureUserMenuButton(targetId, true);

    // Update message text to show it was allowed
    bot.editMessageText(
      query.message.text + `\n\n🟢 <b>Статус: ДОСТУП РАЗРЕШЕН</b> (Одобрено в ${new Date().toLocaleTimeString()})`,
      {
        chat_id: adminId,
        message_id: query.message.message_id,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [] } // Remove buttons
      }
    ).catch(() => {});

    bot.sendMessage(targetId, `🟢 <b>ДОСТУП РАЗРЕШЕН!</b>\nАдминистратор одобрил твою лицензию.\n\nУ тебя появилась кнопка <b>💻 FDC ВЕБ-HUD</b> в левом нижнем углу чата. Нажми на нее для запуска тактического калькулятора!`, { parse_mode: "HTML" })
      .catch(() => {});

    bot.answerCallbackQuery(query.id, { text: "Доступ успешно разрешен!" });

  } else if (data.startsWith("block_")) {
    const targetId = Number(data.split("_")[1]);
    if (isNaN(targetId)) return bot.answerCallbackQuery(query.id, { text: "Неверный ID" });

    if (targetId === adminId) {
      return bot.answerCallbackQuery(query.id, { text: "Вы не можете заблокировать самого себя!", show_alert: true });
    }

    const allowed = getAllowedUsers();
    allowed.delete(targetId);
    updateEnvWhitelist(adminId, allowed);
    configureUserMenuButton(targetId, false);

    // Update message text to show it was blocked
    bot.editMessageText(
      query.message.text + `\n\n🔴 <b>Статус: ЗАБЛОКИРОВАН</b> (Отклонено в ${new Date().toLocaleTimeString()})`,
      {
        chat_id: adminId,
        message_id: query.message.message_id,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [] } // Remove buttons
      }
    ).catch(() => {});

    bot.sendMessage(targetId, `🔴 <b>ДОСТУП ПРИОСТАНОВЛЕН!</b>\nТвоя авторизация была аннулирована администратором.`, { parse_mode: "HTML" })
      .catch(() => {});

    bot.answerCallbackQuery(query.id, { text: "Доступ аннулирован!" });
  }
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
    bot.sendMessage(userId, `🔴 <b>ДОСТУП ОГРАНИЧЕН (SEC_GUARD_ALERT)</b>\n───────────────────\nДля использования тактического артиллерийского веб-калькулятора требуется авторизация.\n\n👤 Твой Telegram ID: <code>${userId}</code>\n\nОтправь этот ID администратору для получения доступа к вычислителю. Ваши данные отправлены админу на рассмотрение.`, { parse_mode: "HTML" });
    
    // Notify admin
    notifyAdminAccessRequest(msg.from, userId);
  }
});

