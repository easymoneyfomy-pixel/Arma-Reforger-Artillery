const fs = require("fs");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

// ============================================================================
// 1. Load Ballistic Data
// ============================================================================
const WEAPONS_PATH = path.join(__dirname, "../src/data/weapons.json");
let weapons = [];
try {
  weapons = JSON.parse(fs.readFileSync(WEAPONS_PATH, "utf8"));
  console.log(`[SYS] Loaded ${weapons.length} weapon systems from weapons.json.`);
} catch (err) {
  console.error("[ERR] Failed to load weapons.json:", err);
}

// ============================================================================
// 2. Coordinate & Vector Math Functions (Ported from coords.ts)
// ============================================================================
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function parseAxis(input, worldSizeM = 12800) {
  const s = input.trim();
  if (!s) return null;
  if (/[.,]/.test(s) || s.length > 4) {
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? clamp(n, 0, worldSizeM) : null;
  }
  if (!/^\d+$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? clamp(n, 0, worldSizeM) : null;
  }
  let km;
  if (s.length === 1) km = Number(s);
  else if (s.length === 2) km = Number(s);
  else km = Number(s.slice(0, 2)) + Number(s.slice(2)) / Math.pow(10, s.length - 2);
  return clamp(km * 1000, 0, worldSizeM);
}

function parseGridPair(input, worldSizeM = 12800) {
  const cleaned = input.replace(/[^0-9 ,;\-/]/g, "").trim();
  if (!cleaned) return null;
  const parts = cleaned.split(/[\s,;/\-]+/).filter(Boolean);
  if (parts.length === 2) {
    const x = parseAxis(parts[0], worldSizeM);
    const y = parseAxis(parts[1], worldSizeM);
    if (x == null || y == null) return null;
    return { x, y };
  }
  if (parts.length === 1 && parts[0].length >= 2 && parts[0].length % 2 === 0) {
    const half = parts[0].length / 2;
    const x = parseAxis(parts[0].slice(0, half), worldSizeM);
    const y = parseAxis(parts[0].slice(half), worldSizeM);
    if (x == null || y == null) return null;
    return { x, y };
  }
  return null;
}

function formatGrid(m, digits = 3) {
  const km = m / 1000;
  const factor = Math.pow(10, digits - 1);
  const v = Math.floor(km * factor);
  return v.toString().padStart(digits, "0");
}

function formatFullGrid(pos) {
  return `${formatGrid(pos.x, 3)} ${formatGrid(pos.y, 3)} (Alt: ${pos.z.toFixed(0)}m)`;
}

function dist2D(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function bearingRad(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const angle = Math.atan2(dx, dy);
  return (angle + 2 * Math.PI) % (2 * Math.PI);
}

function radToMil(rad) {
  return (rad * 6400) / (2 * Math.PI);
}

function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

// ============================================================================
// 3. Ballistics FDC Calculations (Ported from ballistics.ts)
// ============================================================================
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function interpolateCharge(charge, range) {
  const rows = charge.rows;
  if (!rows.length) return null;
  if (range <= rows[0].range_m) {
    return { elevation_mil: rows[0].elevation_mil, tof_sec: rows[0].tof_sec, inRange: false };
  }
  const last = rows[rows.length - 1];
  if (range >= last.range_m) {
    return { elevation_mil: last.elevation_mil, tof_sec: last.tof_sec, inRange: false };
  }
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    if (range >= a.range_m && range <= b.range_m) {
      const t = (range - a.range_m) / (b.range_m - a.range_m);
      return {
        elevation_mil: lerp(a.elevation_mil, b.elevation_mil, t),
        tof_sec: lerp(a.tof_sec, b.tof_sec, t),
        inRange: true,
      };
    }
  }
  return null;
}

function pickOptimalCharge(ammo, range) {
  let best = null;
  for (const c of ammo.charges) {
    const r = interpolateCharge(c, range);
    if (!r || !r.inRange) continue;
    const elev = r.elevation_mil;
    let score = 0;
    if (elev < 800) score -= 200 + (800 - elev);
    else if (elev > 1250) score -= 50 + (elev - 1250);
    else score += 100 - Math.abs(elev - 1050) * 0.1;
    score += (10 - parseInt(c.id, 10)) * 2;
    if (!best || score > best.score) best = { id: c.id, score };
  }
  return best ? best.id : null;
}

function chargeRangeBand(charge) {
  const rs = charge.rows;
  return { min: rs[0].range_m, max: rs[rs.length - 1].range_m };
}

function computeSolution(weapon, ammo, chargeId, gun, target) {
  const charge = ammo.charges.find((c) => c.id === chargeId);
  if (!charge) return null;
  const ground = dist2D(gun, target);
  const interp = interpolateCharge(charge, ground);
  const bRad = bearingRad(gun, target);
  const warnings = [];
  if (!interp) return null;
  if (!interp.inRange) {
    const band = chargeRangeBand(charge);
    if (ground < band.min) warnings.push(`Range ${ground.toFixed(0)}m below charge min ${band.min}m`);
    if (ground > band.max) warnings.push(`Range ${ground.toFixed(0)}m above charge max ${band.max}m`);
  }
  const dz = target.z - gun.z;
  if (Math.abs(dz) >= 25) {
    warnings.push(`Alt delta ${dz >= 0 ? "+" : ""}${dz.toFixed(0)}m — tables assume level terrain`);
  }
  const elev = interp.elevation_mil;
  const arc = elev >= 800 ? "high" : elev >= 400 ? "low" : "flat";
  return {
    rangeM: ground,
    bearingMil: radToMil(bRad),
    bearingDeg: radToDeg(bRad),
    elevationMil: elev,
    tofSec: interp.tof_sec,
    chargeId: charge.id,
    chargeLabel: charge.label,
    ammoId: ammo.id,
    weaponId: weapon.id,
    warnings,
    arc,
    altDeltaM: dz,
  };
}

function correctionDelta(gun, target, impact) {
  const dxT = target.x - gun.x;
  const dyT = target.y - gun.y;
  const len = Math.hypot(dxT, dyT) || 1;
  const ux = dxT / len;
  const uy = dyT / len;
  const rx = uy;
  const ry = -ux;
  const dxI = impact.x - target.x;
  const dyI = impact.y - target.y;
  return {
    rangeM: Math.hypot(impact.x - gun.x, impact.y - gun.y),
    alongM: dxI * ux + dyI * uy,
    crossM: dxI * rx + dyI * ry,
  };
}

function correctedTarget(target, impact) {
  return {
    x: target.x + (target.x - impact.x),
    y: target.y + (target.y - impact.y),
    z: target.z,
  };
}

// ============================================================================
// 4. Dynamic Vector Map Generator (QuickChart Scatter Plot)
// ============================================================================
function generateTacticalChartUrl(gun, target, impact = null) {
  // Determine viewport bounds automatically to fit all points beautifully
  const points = [gun, target];
  if (impact) points.push(impact);
  
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  const dx = maxX - minX || 100;
  const dy = maxY - minY || 100;
  
  const padX = dx * 0.25;
  const padY = dy * 0.25;
  
  const scaleMinX = Math.max(0, minX - padX);
  const scaleMaxX = maxX + padX;
  const scaleMinY = Math.max(0, minY - padY);
  const scaleMaxY = maxY + padY;

  const datasets = [
    {
      label: `Gun position [${formatGrid(gun.x, 3)} ${formatGrid(gun.y, 3)}]`,
      data: [{ x: gun.x, y: gun.y }],
      backgroundColor: "#d6ff3a",
      pointRadius: 9,
      pointStyle: "circle"
    },
    {
      label: `Target coordinates [${formatGrid(target.x, 3)} ${formatGrid(target.y, 3)}]`,
      data: [{ x: target.x, y: target.y }],
      backgroundColor: "#e04646",
      pointRadius: 9,
      pointStyle: "crossRot"
    },
    {
      label: "Aiming Vector",
      data: [{ x: gun.x, y: gun.y }, { x: target.x, y: target.y }],
      showLine: true,
      fill: false,
      borderColor: "rgba(214, 255, 58, 0.45)",
      borderDash: [6, 4],
      borderWidth: 2.5,
      pointRadius: 0
    }
  ];

  if (impact) {
    datasets.push({
      label: `Impact spot [${formatGrid(impact.x, 3)} ${formatGrid(impact.y, 3)}]`,
      data: [{ x: impact.x, y: impact.y }],
      backgroundColor: "#f59e0b",
      pointRadius: 9,
      pointStyle: "triangle"
    });
    datasets.push({
      label: "Miss deviation",
      data: [{ x: target.x, y: target.y }, { x: impact.x, y: impact.y }],
      showLine: true,
      fill: false,
      borderColor: "rgba(245, 158, 11, 0.5)",
      borderDash: [3, 3],
      borderWidth: 1.5,
      pointRadius: 0
    });
  }

  const chartConfig = {
    type: "scatter",
    data: { datasets },
    options: {
      backgroundColor: "#06070a",
      title: {
        display: true,
        text: "SYS: FDC TACTICAL VECTOR PLOT",
        fontColor: "#d6ff3a",
        fontSize: 14,
        fontFamily: "monospace"
      },
      legend: {
        position: "bottom",
        labels: {
          fontColor: "#a1a1aa",
          fontFamily: "monospace",
          fontSize: 9,
          padding: 10
        }
      },
      scales: {
        xAxes: [{
          gridLines: { color: "rgba(255, 255, 255, 0.06)", zeroLineColor: "#1e293b", drawBorder: true },
          ticks: { fontColor: "#52525b", fontFamily: "monospace", fontSize: 9, min: Math.round(scaleMinX), max: Math.round(scaleMaxX) }
        }],
        yAxes: [{
          gridLines: { color: "rgba(255, 255, 255, 0.06)", zeroLineColor: "#1e293b", drawBorder: true },
          ticks: { fontColor: "#52525b", fontFamily: "monospace", fontSize: 9, min: Math.round(scaleMinY), max: Math.round(scaleMaxY) }
        }]
      }
    }
  };

  return `https://quickchart.io/chart?width=500&height=400&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
}

// ============================================================================
// 5. In-Memory User States Database
// ============================================================================
const userStates = new Map();

function getUserState(userId) {
  if (!userStates.has(userId)) {
    userStates.set(userId, {
      activeGun: { x: 6400, y: 6400, z: 100 },
      activeWeaponId: "m252_81mm",
      activeChargeId: "auto",
      lastTarget: null,
      lastSolution: null,
      presets: {
        "everon_airport": { x: 1400, y: 11000, z: 120 },
        "arland_airbase": { x: 1200, y: 3200, z: 45 }
      }
    });
  }
  return userStates.get(userId);
}

// ============================================================================
// 6. Telegram Bot Handlers & Access Control
// ============================================================================
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("[ERR] TELEGRAM_BOT_TOKEN is not defined in your environment or .env file!");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
console.log("[SYS] Telegram bot FDC listener is ACTIVE. Polling for inputs...");

// Set global Web App menu button
bot.setChatMenuButton({
  menu_button: {
    type: "web_app",
    text: "💻 FDC ВЕБ-HUD",
    web_app: {
      url: "https://easymoneyfomy-pixel.github.io/Arma-Reforger-Artillery/"
    }
  }
}).then(() => {
  console.log("[SYS] Global Web App Menu Button configured successfully.");
}).catch((err) => {
  console.error("[ERR] Failed to set Chat Menu Button:", err);
});

// Helper: Rich HUD styling headers
const HUD_HEADER = `🤖 <b>[FDC TERMINAL v1.2]</b>\n───────────────────\n`;

// Whitelist and Security Helpers
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
  
  // Set in current process
  process.env.ADMIN_ID = adminId.toString();
  process.env.ALLOWED_USERS = array.join(",");
}

// Main Guard Middleware Function
function checkAccess(msg) {
  const userId = msg.from.id;
  const adminId = getAdminId();

  // 1. Auto-bootstrap the first user who starts the bot as Admin
  if (!adminId) {
    console.log(`[SEC] Bootstrapping Admin settings for User ID: ${userId}`);
    const allowed = new Set([userId]);
    updateEnvWhitelist(userId, allowed);
    return true;
  }

  // 2. Validate user ID is in whitelist
  const allowed = getAllowedUsers();
  if (userId !== adminId && !allowed.has(userId)) {
    console.warn(`[SEC] Unauthorized connection attempt from User ID: ${userId}`);
    bot.sendMessage(msg.chat.id, `🔴 <b>ДОСТУП ЗАБЛОКИРОВАН (SEC_GUARD_ALERT)</b>\n───────────────────\nТвой Telegram User ID (<code>${userId}</code>) не авторизован для работы с этим тактическим вычислителем.\n\nЗапроси разрешение у администратора терминала.`, { parse_mode: "HTML" });
    return false;
  }
  return true;
}

// ============================================================================
// 7. Core Command Handlers
// ============================================================================

// Command: /start
bot.onText(/\/start/, (msg) => {
  if (!checkAccess(msg)) return;

  const state = getUserState(msg.from.id);
  const helpText = `${HUD_HEADER}🎯 <b>FDC СИСТЕМА ГОТОВА К РАБОТЕ!</b>
Это твой зашифрованный мобильный FDC-калькулятор для <b>Arma Reforger</b>.

<b>📍 ТАКТИЧЕСКИЕ КОМАНДЫ:</b>
🔹 <code>/setgun [grid/X Y] [Alt]</code> — Развернуть орудие.
🔹 <code>/fire [grid/X Y] [Alt]</code> — Выдать баллистическое решение.
🔹 <code>/correct [grid/X Y] [Alt]</code> — Ввести поправку по разрыву.
🔹 <code>/weapon</code> — Сменить тип орудия.
🔹 <code>/charge</code> — Задать режим заряда.
🔹 <code>/presets</code> — Ориентиры и координаты.

<i>Орудие: <b>${weapons.find(w => w.id === state.activeWeaponId)?.name || "M252"}</b></i>
<i>Заряд: <b>${state.activeChargeId === "auto" ? "Автовыбор" : "Заряд " + state.activeChargeId}</b></i>
<i>Координаты: <code>${formatFullGrid(state.activeGun)}</code></i>
───────────────────
Введи <code>/help</code> для полной сводки по координатам и командам.`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "🖥️ ОТКРЫТЬ ТАКТИЧЕСКИЙ ВЕБ-HUD",
          web_app: { url: "https://easymoneyfomy-pixel.github.io/Arma-Reforger-Artillery/" }
        }
      ],
      [
        { text: "🔫 Орудие", callback_data: "menu_weapon" },
        { text: "🔋 Заряд", callback_data: "menu_charge" }
      ],
      [
        { text: "🛰️ Статус", callback_data: "menu_status" },
        { text: "📊 Дальности", callback_data: "menu_range" }
      ]
    ]
  };

  bot.sendMessage(msg.chat.id, helpText, { 
    parse_mode: "HTML",
    reply_markup: keyboard
  });
});

// Command: /help
bot.onText(/\/help/, (msg) => {
  if (!checkAccess(msg)) return;

  const helpText = `${HUD_HEADER}📖 <b>СПРАВКА ТАКТИЧЕСКОГО РАЗДЕЛА:</b>

<b>1️⃣ Координаты (форматы ввода):</b>
• <b>6-значный грид:</b> <code>024036</code> (pad к метрам 2400м East, 3600м North)
• <b>8-значный грид:</b> <code>02450368</code> (pad к метрам X=2450, Y=3680)
• <b>Координаты в метрах:</b> <code>2450 3680</code> (раздели пробелом)
• <b>Полноценный ввод:</b> <code>/fire 028045 150</code> (расчет по координатам и высоте цели 150м)

<b>2️⃣ Функции стрельбы и поправок:</b>
• <code>/fire [грид] [высота]</code> — Расчет Azimuth/Elevation/TOF с <b>визуализацией на векторной миникарте</b>.
• <code>/correct [грид_вспышки] [высота]</code> — Расчет боковых и продольных отклонений и построение зеркальной миникарты корректировки.
• <code>/mirror</code> — Огневое решение по скорректированной цели.
• <code>/status</code> — Показать текущее состояние вычислителя (орудие, заряд, позиция).
• <code>/range</code> — Показать диапазоны дальности для текущего орудия.

<b>3️⃣ Команды Безопасности (только для Админа):</b>
• <code>/allow [user_id]</code> — Авторизовать пользователя (дать доступ к боту).
• <code>/block [user_id]</code> — Лишить пользователя доступа.
• <code>/whitelist</code> — Показать всех авторизованных стрелков.`;

  bot.sendMessage(msg.chat.id, helpText, { parse_mode: "HTML" });
});

// Command: /status
bot.onText(/\/status/, (msg) => {
  if (!checkAccess(msg)) return;

  const chatId = msg.chat.id;
  const state = getUserState(msg.from.id);
  const weapon = weapons.find(w => w.id === state.activeWeaponId) || weapons[0];
  
  let text = `${HUD_HEADER}🛰️ <b>ТЕКУЩИЙ СТАТУС ВЫЧИСЛИТЕЛЯ (FDC TELEMETRY):</b>\n\n`;
  text += `🔫 <b>Орудие:</b> <code>${weapon.name}</code> ${weapon.isMod ? "[MOD]" : "[VANILLA]"}\n`;
  text += `🔋 <b>Режим заряда:</b> <code>${state.activeChargeId === "auto" ? "АВТОВЫБОР (Оптимальный)" : "Заряд " + state.activeChargeId}</code>\n`;
  text += `📍 <b>Позиция орудия:</b> <code>${formatFullGrid(state.activeGun)}</code>\n`;
  
  if (state.lastTarget) {
    text += `───────────────────\n`;
    text += `🎯 <b>Последняя цель:</b> <code>${formatFullGrid(state.lastTarget)}</code>\n`;
    if (state.lastSolution) {
      text += `📏 <b>Дальность:</b> <code>${state.lastSolution.rangeM.toFixed(0)} м</code>\n`;
      text += `🧭 <b>Азимут:</b> <code>${state.lastSolution.bearingMil.toFixed(0)} mils</code> (${state.lastSolution.bearingDeg.toFixed(1)}°)\n`;
      text += `📐 <b>Прицел:</b> <code>${state.lastSolution.elevationMil.toFixed(0)} mils</code>\n`;
      text += `⏱️ <b>TOF (Время полета):</b> <code>${state.lastSolution.tofSec.toFixed(1)} сек</code>\n`;
    }
  } else {
    text += `───────────────────\n`;
    text += `🎯 <i>Цели еще не рассчитывались. Используй /fire.</i>\n`;
  }
  
  bot.sendMessage(chatId, text, { parse_mode: "HTML" });
});

// Command: /range
bot.onText(/\/range/, (msg) => {
  if (!checkAccess(msg)) return;

  const chatId = msg.chat.id;
  const state = getUserState(msg.from.id);
  const weapon = weapons.find(w => w.id === state.activeWeaponId);

  if (!weapon) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Орудие не выбрано!</b>`, { parse_mode: "HTML" });
  }

  const ammo = weapon.ammo[0];
  let text = `${HUD_HEADER}📊 <b>ДИАПАЗОНЫ ДАЛЬНОСТЕЙ ДЛЯ:</b>\n🔫 <i>${weapon.name}</i>\n📦 <i>Снаряд: ${ammo.name}</i>\n───────────────────\n`;

  ammo.charges.forEach((c) => {
    const band = chargeRangeBand(c);
    text += `🔋 <b>${c.label}</b> (Заряд: <code>${c.id}</code>):\n`;
    text += `• Минимальная: <code>${band.min.toFixed(0)} м</code>\n`;
    text += `• Максимальная: <code>${band.max.toFixed(0)} м</code>\n\n`;
  });

  text += `<i>Система автоматически выберет оптимальный заряд, если включен Автовыбор (/charge -> Автовыбор).</i>`;

  bot.sendMessage(chatId, text, { parse_mode: "HTML" });
});

// Whitelist Command: /allow (Admin Only)
bot.onText(/\/allow(?:\s+(.+))?/, (msg, match) => {
  if (!checkAccess(msg)) return;

  const userId = msg.from.id;
  const adminId = getAdminId();
  const args = match[1];

  if (userId !== adminId) {
    return bot.sendMessage(msg.chat.id, `${HUD_HEADER}❌ <b>Ошибка:</b> Данная команда доступна только Главному Администратору.`, { parse_mode: "HTML" });
  }

  if (!args) {
    return bot.sendMessage(msg.chat.id, `${HUD_HEADER}⚠️ <b>Пример использования:</b>\n<code>/allow 123456789</code> (где цифры — ID другого игрока)`, { parse_mode: "HTML" });
  }

  const targetId = Number(args.trim());
  if (!targetId || isNaN(targetId)) {
    return bot.sendMessage(msg.chat.id, `${HUD_HEADER}❌ <b>Неверный ID пользователя!</b>`, { parse_mode: "HTML" });
  }

  const allowed = getAllowedUsers();
  allowed.add(targetId);
  updateEnvWhitelist(adminId, allowed);

  bot.sendMessage(msg.chat.id, `${HUD_HEADER}✅ <b>ПОЛЬЗОВАТЕЛЬ АВТОРИЗОВАН!</b>\nСтрелок <code>${targetId}</code> успешно добавлен в базу и может пользоваться ботом.`, { parse_mode: "HTML" });
});

// Whitelist Command: /block (Admin Only)
bot.onText(/\/block(?:\s+(.+))?/, (msg, match) => {
  if (!checkAccess(msg)) return;

  const userId = msg.from.id;
  const adminId = getAdminId();
  const args = match[1];

  if (userId !== adminId) {
    return bot.sendMessage(msg.chat.id, `${HUD_HEADER}❌ <b>Ошибка:</b> Данная команда доступна только Главному Администратору.`, { parse_mode: "HTML" });
  }

  if (!args) {
    return bot.sendMessage(msg.chat.id, `${HUD_HEADER}⚠️ <b>Пример использования:</b>\n<code>/block 123456789</code>`, { parse_mode: "HTML" });
  }

  const targetId = Number(args.trim());
  if (targetId === adminId) {
    return bot.sendMessage(msg.chat.id, `${HUD_HEADER}❌ <b>Ты не можешь заблокировать себя!</b>`, { parse_mode: "HTML" });
  }

  const allowed = getAllowedUsers();
  allowed.delete(targetId);
  updateEnvWhitelist(adminId, allowed);

  bot.sendMessage(msg.chat.id, `${HUD_HEADER}❌ <b>ДОСТУП АННУЛИРОВАН!</b>\nПользователь <code>${targetId}</code> удален из системы доступа.`, { parse_mode: "HTML" });
});

// Whitelist Command: /whitelist (Admin Only)
bot.onText(/\/whitelist/, (msg) => {
  if (!checkAccess(msg)) return;

  const userId = msg.from.id;
  const adminId = getAdminId();

  if (userId !== adminId) {
    return bot.sendMessage(msg.chat.id, `${HUD_HEADER}❌ <b>Ошибка:</b> Данная команда доступна только Главному Администратору.`, { parse_mode: "HTML" });
  }

  const allowed = getAllowedUsers();
  let text = `${HUD_HEADER}🔒 <b>СПИСОК АВТОРИЗОВАННЫХ ПОЛЬЗОВАТЕЛЕЙ:</b>\n\n`;
  allowed.forEach(id => {
    text += `• <code>${id}</code> ${id === adminId ? "👑 [Администратор]" : "🔫 [Снайпер]"} \n`;
  });

  bot.sendMessage(msg.chat.id, text, { parse_mode: "HTML" });
});

// Command: /setgun
bot.onText(/\/setgun(?:\s+(.+))?/, (msg, match) => {
  if (!checkAccess(msg)) return;

  const chatId = msg.chat.id;
  const state = getUserState(msg.from.id);
  const argsStr = match[1];

  if (!argsStr) {
    return bot.sendMessage(chatId, `${HUD_HEADER}⚠️ <b>Использование:</b>\n<code>/setgun [grid/X Y] [Alt]</code>\nПример: <code>/setgun 024036 120</code>`, { parse_mode: "HTML" });
  }

  const parts = argsStr.trim().split(/\s+/);
  let coords = null;
  let alt = 0;

  if (parts.length === 2 && parts[0].length >= 6) {
    coords = parseGridPair(parts[0]);
    alt = Number(parts[1]) || 0;
  } else if (parts.length === 3) {
    coords = parseGridPair(`${parts[0]} ${parts[1]}`);
    alt = Number(parts[2]) || 0;
  } else {
    coords = parseGridPair(parts.join(" "));
  }

  if (!coords) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Ошибка координат!</b> Введи корректный грид (e.g. <code>024036</code>).`, { parse_mode: "HTML" });
  }

  state.activeGun = { x: coords.x, y: coords.y, z: alt };
  bot.sendMessage(chatId, `${HUD_HEADER}✅ <b>КООРДИНАТЫ ОРУДИЯ ОБНОВЛЕНЫ!</b>\n📍 Позиция: <code>${formatFullGrid(state.activeGun)}</code>`, { parse_mode: "HTML" });
});

// Command: /weapon
bot.onText(/\/weapon/, (msg) => {
  if (!checkAccess(msg)) return;

  const chatId = msg.chat.id;
  const keyboard = {
    inline_keyboard: weapons.map((w) => [
      { text: `${w.faction === "US" ? "🇺🇸" : "🇷🇺"} ${w.name} ${w.isMod ? "[MOD]" : ""}`, callback_data: `wpn_${w.id}` }
    ])
  };

  bot.sendMessage(chatId, `${HUD_HEADER}🛰️ <b>ВЫБЕРИ ОРУЖЕЙНУЮ СИСТЕМУ:</b>`, {
    parse_mode: "HTML",
    reply_markup: keyboard
  });
});

// Command: /charge
bot.onText(/\/charge/, (msg) => {
  if (!checkAccess(msg)) return;

  const chatId = msg.chat.id;
  const state = getUserState(msg.from.id);
  const wpn = weapons.find(w => w.id === state.activeWeaponId);

  if (!wpn) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Выбери орудие через /weapon!</b>`, { parse_mode: "HTML" });
  }

  const ammo = wpn.ammo[0];
  const buttons = [[{ text: "⚡ АВТОВЫБОР (Оптимальный)", callback_data: "chg_auto" }]];
  ammo.charges.forEach((c) => {
    buttons.push([{ text: `🔋 ${c.label}`, callback_data: `chg_${c.id}` }]);
  });

  bot.sendMessage(chatId, `${HUD_HEADER}🔋 <b>ВЫБЕРИ СИЛУ ЗАРЯДА:</b>\nСистема: <i>${wpn.name}</i>`, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons }
  });
});

// Command: /save
bot.onText(/\/save(?:\s+(.+))?/, (msg, match) => {
  if (!checkAccess(msg)) return;

  const chatId = msg.chat.id;
  const state = getUserState(msg.from.id);
  const argsStr = match[1];

  if (!argsStr) {
    return bot.sendMessage(chatId, `${HUD_HEADER}⚠️ <b>Использование:</b>\n<code>/save [название] [grid] [Alt]</code>\nПример: <code>/save target_alpha 016073 80</code>`, { parse_mode: "HTML" });
  }

  const parts = argsStr.trim().split(/\s+/);
  if (parts.length < 2) {
    return bot.sendMessage(chatId, `${HUD_HEADER}⚠️ <b>Недостаточно данных!</b>`, { parse_mode: "HTML" });
  }

  const name = parts[0].toLowerCase();
  const coordStr = parts.slice(1).join(" ");
  
  let alt = 0;
  let parsedStr = coordStr;
  if (parts.length >= 3 && !isNaN(parts[parts.length - 1])) {
    alt = Number(parts[parts.length - 1]);
    parsedStr = parts.slice(1, -1).join(" ");
  }

  const coords = parseGridPair(parsedStr);
  if (!coords) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Ошибка координат!</b>`, { parse_mode: "HTML" });
  }

  state.presets[name] = { x: coords.x, y: coords.y, z: alt };
  bot.sendMessage(chatId, `${HUD_HEADER}💾 <b>ТАКТИЧЕСКИЙ ОРИЕНТИР СОХРАНЕН!</b>\n🔑 Название: <b>${name}</b>\n📍 Позиция: <code>${formatFullGrid(state.presets[name])}</code>`, { parse_mode: "HTML" });
});

// Command: /presets
bot.onText(/\/presets/, (msg) => {
  if (!checkAccess(msg)) return;

  const chatId = msg.chat.id;
  const state = getUserState(msg.from.id);
  const keys = Object.keys(state.presets);

  if (keys.length === 0) {
    return bot.sendMessage(chatId, `${HUD_HEADER}📭 <b>Список ориентиров пуст!</b>`, { parse_mode: "HTML" });
  }

  let text = `${HUD_HEADER}🗺️ <b>БАЗА ТАКТИЧЕСКИХ ОРИЕНТИРОВ:</b>\n\n`;
  keys.forEach((k) => {
    const p = state.presets[k];
    text += `🔸 <b>${k}</b>: <code>${formatGrid(p.x, 3)} ${formatGrid(p.y, 3)}</code> (Alt: ${p.z}m)\n<i>Выстрел: <code>/fire ${k}</code></i>\n\n`;
  });

  bot.sendMessage(chatId, text, { parse_mode: "HTML" });
});

// Callback Query Handler
bot.on("callback_query", (query) => {
  const data = query.data;
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const state = getUserState(userId);

  bot.answerCallbackQuery(query.id);

  if (data === "menu_weapon") {
    const keyboard = {
      inline_keyboard: weapons.map((w) => [
        { text: `${w.faction === "US" ? "🇺🇸" : "🇷🇺"} ${w.name} ${w.isMod ? "[MOD]" : ""}`, callback_data: `wpn_${w.id}` }
      ])
    };
    bot.sendMessage(chatId, `${HUD_HEADER}🛰️ <b>ВЫБЕРИ ОРУЖЕЙНУЮ СИСТЕМУ:</b>`, {
      parse_mode: "HTML",
      reply_markup: keyboard
    });
    return;
  }

  if (data === "menu_charge") {
    const wpn = weapons.find(w => w.id === state.activeWeaponId) || weapons[0];
    const ammo = wpn.ammo[0];
    const buttons = [[{ text: "⚡ АВТОВЫБОР (Оптимальный)", callback_data: "chg_auto" }]];
    ammo.charges.forEach((c) => {
      buttons.push([{ text: `🔋 ${c.label}`, callback_data: `chg_${c.id}` }]);
    });
    bot.sendMessage(chatId, `${HUD_HEADER}🔋 <b>ВЫБЕРИ СИЛУ ЗАРЯДА:</b>\nСистема: <i>${wpn.name}</i>`, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  if (data === "menu_status") {
    const weapon = weapons.find(w => w.id === state.activeWeaponId) || weapons[0];
    let text = `${HUD_HEADER}🛰️ <b>ТЕКУЩИЙ СТАТУС ВЫЧИСЛИТЕЛЯ (FDC TELEMETRY):</b>\n\n`;
    text += `🔫 <b>Орудие:</b> <code>${weapon.name}</code> ${weapon.isMod ? "[MOD]" : "[VANILLA]"}\n`;
    text += `🔋 <b>Режим заряда:</b> <code>${state.activeChargeId === "auto" ? "АВТОВЫБОР (Оптимальный)" : "Заряд " + state.activeChargeId}</code>\n`;
    text += `📍 <b>Позиция орудия:</b> <code>${formatFullGrid(state.activeGun)}</code>\n`;
    
    if (state.lastTarget) {
      text += `───────────────────\n`;
      text += `🎯 <b>Последняя цель:</b> <code>${formatFullGrid(state.lastTarget)}</code>\n`;
      if (state.lastSolution) {
        text += `📏 <b>Дальность:</b> <code>${state.lastSolution.rangeM.toFixed(0)} м</code>\n`;
        text += `🧭 <b>Азимут:</b> <code>${state.lastSolution.bearingMil.toFixed(0)} mils</code> (${state.lastSolution.bearingDeg.toFixed(1)}°)\n`;
        text += `📐 <b>Прицел:</b> <code>${state.lastSolution.elevationMil.toFixed(0)} mils</code>\n`;
        text += `⏱️ <b>TOF (Время полета):</b> <code>${state.lastSolution.tofSec.toFixed(1)} сек</code>\n`;
      }
    } else {
      text += `───────────────────\n`;
      text += `🎯 <i>Цели еще не рассчитывались. Используй /fire.</i>\n`;
    }
    bot.sendMessage(chatId, text, { parse_mode: "HTML" });
    return;
  }

  if (data === "menu_range") {
    const weapon = weapons.find(w => w.id === state.activeWeaponId);
    if (!weapon) {
      return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Орудие не выбрано!</b>`, { parse_mode: "HTML" });
    }
    const ammo = weapon.ammo[0];
    let text = `${HUD_HEADER}📊 <b>ДИАПАЗОНЫ ДАЛЬНОСТЕЙ ДЛЯ:</b>\n🔫 <i>${weapon.name}</i>\n📦 <i>Снаряд: ${ammo.name}</i>\n───────────────────\n`;
    ammo.charges.forEach((c) => {
      const band = chargeRangeBand(c);
      text += `🔋 <b>${c.label}</b> (Заряд: <code>${c.id}</code>):\n`;
      text += `• Минимальная: <code>${band.min.toFixed(0)} м</code>\n`;
      text += `• Максимальная: <code>${band.max.toFixed(0)} м</code>\n\n`;
    });
    text += `<i>Система автоматически выберет оптимальный заряд, если включен Автовыбор.</i>`;
    bot.sendMessage(chatId, text, { parse_mode: "HTML" });
    return;
  }

  if (data.startsWith("wpn_")) {
    const wpnId = data.substring(4);
    const wpn = weapons.find(w => w.id === wpnId);
    if (wpn) {
      state.activeWeaponId = wpnId;
      state.activeChargeId = "auto";
      bot.sendMessage(chatId, `${HUD_HEADER}🛰️ <b>СИСТЕМА ИЗМЕНЕНА:</b>\n🔫 Орудие: <b>${wpn.name}</b>\n⚡ Подбор заряда: <b>Автовыбор</b>.`, { parse_mode: "HTML" });
    }
  }

  if (data.startsWith("chg_")) {
    const chgId = data.substring(4);
    state.activeChargeId = chgId;
    bot.sendMessage(chatId, `${HUD_HEADER}🔋 <b>ЗАРЯД ИЗМЕНЕН:</b>\n⚡ Значение: <b>${chgId === "auto" ? "АВТОВЫБОР" : "Заряд " + chgId}</b>`, { parse_mode: "HTML" });
  }
});

// Command: /fire
bot.onText(/\/fire(?:\s+(.+))?/, (msg, match) => {
  if (!checkAccess(msg)) return;

  const chatId = msg.chat.id;
  const state = getUserState(msg.from.id);
  const argsStr = match[1];

  if (!argsStr) {
    return bot.sendMessage(chatId, `${HUD_HEADER}⚠️ <b>Использование:</b>\n<code>/fire [grid/ориентир] [Alt]</code>\nПример: <code>/fire 028045 150</code>`, { parse_mode: "HTML" });
  }

  const parts = argsStr.trim().split(/\s+/);
  let target = null;
  let alt = 0;
  let targetName = "";

  const presetName = parts[0].toLowerCase();
  if (state.presets[presetName]) {
    const p = state.presets[presetName];
    target = { x: p.x, y: p.y, z: p.z };
    targetName = ` [${presetName}]`;
    alt = p.z;
    if (parts.length === 2) {
      alt = Number(parts[1]) || p.z;
      target.z = alt;
    }
  } else {
    if (parts.length === 2 && parts[0].length >= 6) {
      target = parseGridPair(parts[0]);
      alt = Number(parts[1]) || 0;
    } else if (parts.length === 3) {
      target = parseGridPair(`${parts[0]} ${parts[1]}`);
      alt = Number(parts[2]) || 0;
    } else {
      target = parseGridPair(parts.join(" "));
    }
    if (target) target.z = alt;
  }

  if (!target) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Неверные координаты цели!</b>`, { parse_mode: "HTML" });
  }

  const weapon = weapons.find(w => w.id === state.activeWeaponId);
  const ammo = weapon.ammo[0];
  const range = dist2D(state.activeGun, target);
  
  let chargeId = state.activeChargeId;
  if (chargeId === "auto") {
    const opt = pickOptimalCharge(ammo, range);
    if (!opt) {
      return bot.sendMessage(chatId, `${HUD_HEADER}⚠️ <b>ЦЕЛЬ ВНЕ ДИСТАНЦИИ СТРЕЛЬБЫ!</b>\n🎯 Дистанция: <b>${range.toFixed(0)}м</b>\nНи один заряд не достает.`, { parse_mode: "HTML" });
    }
    chargeId = opt;
  }

  const sol = computeSolution(weapon, ammo, chargeId, state.activeGun, target);
  if (!sol) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Ошибка расчета решения!</b>`, { parse_mode: "HTML" });
  }

  state.lastTarget = { ...target };
  state.lastSolution = { ...sol };

  // Generate visual minimap chart
  const minimapUrl = generateTacticalChartUrl(state.activeGun, target);

  let resText = `${HUD_HEADER}💥 <b>ОГНЕВОЕ РЕШЕНИЕ FDC ДЛЯ ЦЕЛИ${targetName.toUpperCase()}:</b>

🔫 Орудие: <b>${weapon.name}</b>
🔋 Заряд: <b>${sol.chargeLabel}</b>
🎯 Дистанция: <b>${sol.rangeM.toFixed(0)} м</b>
🧭 Траектория: <b>${sol.arc === "high" ? "Крутая" : "Пологая"}</b>
───────────────────
🧭 <b>Азимут:</b> <b><code>${sol.bearingMil.toFixed(0)}</code> mils</b> (NATO) / <code>${sol.bearingDeg.toFixed(1)}°</code>
📐 <b>Прицел:</b> <b><code>${sol.elevationMil.toFixed(0)}</code> mils</b>
⏱️ <b>Время полета (TOF):</b> <b><code>${sol.tofSec.toFixed(1)}</code> сек</b>
───────────────────
📢 <b>Команда наводчику:</b>
<code>ЦЕЛЬ ${formatGrid(target.x, 3)}${formatGrid(target.y, 3)}, ЗАРЯД ${sol.chargeId}, НАПРАВЛЕНИЕ ${sol.bearingMil.toFixed(0)}, ПРИЦЕЛ ${sol.elevationMil.toFixed(0)}, TOF ${sol.tofSec.toFixed(0)}</code>
───────────────────
`;

  if (sol.warnings.length > 0) {
    sol.warnings.forEach(w => { resText += `⚠️ <i>${w}</i>\n`; });
  } else {
    resText += `🟢 <i>Решение 100% точно. Расчет завершен.</i>`;
  }

  // Send as photo with caption
  bot.sendPhoto(chatId, minimapUrl, { caption: resText, parse_mode: "HTML" })
    .catch(() => {
      // Fallback to text message if QuickChart API fails or timed out
      bot.sendMessage(chatId, resText, { parse_mode: "HTML" });
    });
});

// Command: /calc
bot.onText(/\/calc(?:\s+(.+))?/, (msg, match) => {
  if (!checkAccess(msg)) return;

  const chatId = msg.chat.id;
  const state = getUserState(msg.from.id);
  const argsStr = match[1];

  if (!argsStr) {
    return bot.sendMessage(chatId, `${HUD_HEADER}⚠️ <b>Использование:</b>\n<code>/calc [грид_орудия] [грид_цели] [высота_орудия] [высота_цели]</code>`, { parse_mode: "HTML" });
  }

  const parts = argsStr.trim().split(/\s+/);
  if (parts.length < 2) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Недостаточно координат для расчета!</b>`, { parse_mode: "HTML" });
  }

  const gunPos = parseGridPair(parts[0]);
  const tarPos = parseGridPair(parts[1]);

  if (!gunPos || !tarPos) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Ошибка парсинга координат!</b>`, { parse_mode: "HTML" });
  }

  let gunAlt = 0;
  let tarAlt = 0;
  if (parts.length >= 3) gunAlt = Number(parts[2]) || 0;
  if (parts.length >= 4) tarAlt = Number(parts[3]) || 0;

  const gun = { x: gunPos.x, y: gunPos.y, z: gunAlt };
  const target = { x: tarPos.x, y: tarPos.y, z: tarAlt };

  const weapon = weapons.find(w => w.id === state.activeWeaponId);
  const ammo = weapon.ammo[0];
  const range = dist2D(gun, target);
  
  const opt = pickOptimalCharge(ammo, range);
  if (!opt) {
    return bot.sendMessage(chatId, `${HUD_HEADER}⚠️ <b>ЦЕЛЬ ВНЕ ДИСТАНЦИИ СТРЕЛЬБЫ!</b>\nДальность: ${range.toFixed(0)}м`, { parse_mode: "HTML" });
  }

  const sol = computeSolution(weapon, ammo, opt, gun, target);
  if (!sol) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Ошибка решения!</b>`, { parse_mode: "HTML" });
  }

  const minimapUrl = generateTacticalChartUrl(gun, target);

  let text = `${HUD_HEADER}⚡ <b>РАЗОВЫЙ БЫСТРЫЙ РАСЧЕТ FDC:</b>

🔫 Орудие: <b>${weapon.name}</b>
📍 Орудие: <code>${formatFullGrid(gun)}</code>
🎯 Цель: <code>${formatFullGrid(target)}</code>
📏 Дистанция: <b>${sol.rangeM.toFixed(0)} м</b>
───────────────────
🧭 Направление: <b><code>${sol.bearingMil.toFixed(0)}</code> mils</b> (${sol.bearingDeg.toFixed(1)}°)
📐 Прицел (Elevation): <b><code>${sol.elevationMil.toFixed(0)}</code> mils</b>
🔋 Заряд: <b>${sol.chargeLabel}</b>
⏱️ Время полета: <b>${sol.tofSec.toFixed(1)} сек</b>
`;

  bot.sendPhoto(chatId, minimapUrl, { caption: text, parse_mode: "HTML" })
    .catch(() => {
      bot.sendMessage(chatId, text, { parse_mode: "HTML" });
    });
});

// Command: /correct
bot.onText(/\/correct(?:\s+(.+))?/, (msg, match) => {
  if (!checkAccess(msg)) return;

  const chatId = msg.chat.id;
  const state = getUserState(msg.from.id);
  const argsStr = match[1];

  if (!state.lastTarget || !state.lastSolution) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Сначала сделай выстрел с помощью /fire!</b>`, { parse_mode: "HTML" });
  }

  if (!argsStr) {
    return bot.sendMessage(chatId, `${HUD_HEADER}⚠️ <b>Использование:</b>\n<code>/correct [грид_вспышки] [Alt]</code>\nПример: <code>/correct 027044 140</code>`, { parse_mode: "HTML" });
  }

  const parts = argsStr.trim().split(/\s+/);
  let impact = null;
  let alt = 0;

  if (parts.length === 2 && parts[0].length >= 6) {
    impact = parseGridPair(parts[0]);
    alt = Number(parts[1]) || 0;
  } else if (parts.length === 3) {
    impact = parseGridPair(`${parts[0]} ${parts[1]}`);
    alt = Number(parts[2]) || 0;
  } else {
    impact = parseGridPair(parts.join(" "));
  }

  if (!impact) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Ошибка распознавания грида вспышки!</b>`, { parse_mode: "HTML" });
  }
  impact.z = alt;

  const delta = correctionDelta(state.activeGun, state.lastTarget, impact);
  const corrected = correctedTarget(state.lastTarget, impact);

  state.pendingCorrected = corrected;

  // Generate correction plot (shows target AND actual impact point!)
  const minimapUrl = generateTacticalChartUrl(state.activeGun, state.lastTarget, impact);

  let text = `${HUD_HEADER}🎯 <b>КОРРЕКТИРОВКА ОГНЯ (SPOTTER ANALYSIS):</b>

📍 Заданная цель: <code>${formatFullGrid(state.lastTarget)}</code>
💥 Точка взрыва: <code>${formatFullGrid(impact)}</code>
───────────────────
📏 <b>ОТКЛОНЕНИЯ ОТ ЦЕЛИ:</b>
• <b>Дальность:</b> ${delta.alongM >= 0 ? `➕ <b>ПЕРЕЛЕТ</b> на <b>${delta.alongM.toFixed(0)}м</b>` : `➖ <b>НЕДОЛЕТ</b> на <b>${Math.abs(delta.alongM).toFixed(0)}м`}
• <b>Линейное:</b> ${delta.crossM >= 0 ? `👉 <b>ПРАВЕЕ</b> на <b>${delta.crossM.toFixed(0)}м</b>` : `👈 <b>ЛЕВЕЕ</b> на <b>${Math.abs(delta.crossM).toFixed(0)}м`}
───────────────────
📢 <b>КОМАНДА КОРРЕКЦИИ ДЛЯ СТРЕЛКА:</b>
👉 <b>${delta.alongM >= 0 ? `УБАВИТЬ ${delta.alongM.toFixed(0)}м` : `ДОБАВИТЬ ${Math.abs(delta.alongM).toFixed(0)}м`}</b>
👉 <b>${delta.crossM >= 0 ? `ДОВЕРНУТЬ ВЛЕВО на ${Math.abs(delta.crossM * 0.5).toFixed(0)}м` : `ДОВЕРНУТЬ ВПРАВО на ${Math.abs(delta.crossM * 0.5).toFixed(0)}м`}</b>
───────────────────
🗺️ <b>СКОРРЕКТИРОВАННАЯ ЦЕЛЬ:</b>
👉 Координаты: <code>${formatGrid(corrected.x, 3)} ${formatGrid(corrected.y, 3)}</code> (Высота: ${corrected.z.toFixed(0)}м)

<i>Чтобы немедленно произвести огневой расчет по скорректированной цели, введи:</i>
👉 /mirror`;

  bot.sendPhoto(chatId, minimapUrl, { caption: text, parse_mode: "HTML" })
    .catch(() => {
      bot.sendMessage(chatId, text, { parse_mode: "HTML" });
    });
});

// Command: /mirror
bot.onText(/\/mirror/, (msg) => {
  if (!checkAccess(msg)) return;

  const chatId = msg.chat.id;
  const state = getUserState(msg.from.id);

  if (!state.pendingCorrected) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Нет сохраненной корректировки цели!</b> Сначала введи поправку с помощью /correct.`, { parse_mode: "HTML" });
  }

  const corrected = state.pendingCorrected;
  state.pendingCorrected = null;

  const weapon = weapons.find(w => w.id === state.activeWeaponId);
  const ammo = weapon.ammo[0];
  const range = dist2D(state.activeGun, corrected);
  
  let chargeId = state.activeChargeId;
  if (chargeId === "auto") {
    const opt = pickOptimalCharge(ammo, range);
    if (!opt) {
      return bot.sendMessage(chatId, `${HUD_HEADER}⚠️ <b>СКОРРЕКТИРОВАННАЯ ЦЕЛЬ ВНЕ ДИСТАНЦИИ СТРЕЛЬБЫ!</b>`, { parse_mode: "HTML" });
    }
    chargeId = opt;
  }

  const sol = computeSolution(weapon, ammo, chargeId, state.activeGun, corrected);
  if (!sol) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Ошибка расчета решения для скорректированной цели!</b>`, { parse_mode: "HTML" });
  }

  state.lastTarget = { ...corrected };
  state.lastSolution = { ...sol };

  const minimapUrl = generateTacticalChartUrl(state.activeGun, corrected);

  let text = `${HUD_HEADER}🎯 <b>ВТОРОЙ ВЫСТРЕЛ (ПО СКОРРЕКТИРОВАННОЙ ЦЕЛИ):</b>

📍 Цель: <code>${formatFullGrid(corrected)}</code>
📏 Дистанция: <b>${sol.rangeM.toFixed(0)} м</b>
🔋 Заряд: <b>${sol.chargeLabel}</b>
───────────────────
🧭 <b>НАПРАВЛЕНИЕ:</b> <b><code>${sol.bearingMil.toFixed(0)}</code> mils</b>
📐 <b>ПРИЦЕЛ (ELEVATION):</b> <b><code>${sol.elevationMil.toFixed(0)}</code> mils</b>
⏱️ <b>TOF (ВРЕМЯ ПОЛЕТА):</b> <b><code>${sol.tofSec.toFixed(1)}</code> сек</b>
───────────────────
📢 <b>РАДИОКОМАНДА СТРЕЛКУ:</b>
<code>ЦЕЛЬ ${formatGrid(corrected.x, 3)}${formatGrid(corrected.y, 3)}, ЗАРЯД ${sol.chargeId}, НАПРАВЛЕНИЕ ${sol.bearingMil.toFixed(0)}, ПРИЦЕЛ ${sol.elevationMil.toFixed(0)}, TOF ${sol.tofSec.toFixed(0)}</code>
`;

  bot.sendPhoto(chatId, minimapUrl, { caption: text, parse_mode: "HTML" })
    .catch(() => {
      bot.sendMessage(chatId, text, { parse_mode: "HTML" });
    });
});
