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
// 4. In-Memory User States Database
// ============================================================================
const userStates = new Map();

function getUserState(userId) {
  if (!userStates.has(userId)) {
    userStates.set(userId, {
      activeGun: { x: 6400, y: 6400, z: 100 }, // Defaults
      activeWeaponId: "m252_81mm",
      activeChargeId: "auto", // "auto" or specific index
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
// 5. Telegram Bot Handlers
// ============================================================================
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("[ERR] TELEGRAM_BOT_TOKEN is not defined in your environment or .env file!");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
console.log("[SYS] Telegram bot FDC listener is ACTIVE. Polling for inputs...");

// Helper: Rich HUD styling headers
const HUD_HEADER = `🤖 <b>[FDC TERMINAL v1.0]</b>\n───────────────────\n`;

// Command: /start
bot.onText(/\/start/, (msg) => {
  const state = getUserState(msg.from.id);
  const helpText = `${HUD_HEADER}🎯 <b>ДОБРО ПОЖАЛОВАТЬ, АРТИЛЛЕРИСТ!</b>
Это твой портативный тактический FDC-вычислитель для <b>Arma Reforger</b>.

<b>📍 БЫСТРЫЕ КОМАНДЫ:</b>
🔹 <code>/setgun [grid/X Y] [Alt]</code> — Задать позицию орудия.
<i>Пример: <code>/setgun 024036 120</code> (грид 024 036, высота 120м)</i>

🔹 <code>/fire [grid/X Y] [Alt]</code> — Расчет огневого решения по цели.
<i>Пример: <code>/fire 028045 150</code></i>

🔹 <code>/correct [grid/X Y] [Alt]</code> — Корректировка огня по месту падения.
<i>Сравнит с последней целью, выдаст поправки и скорректированную позицию.</i>

🔹 <code>/weapon</code> — Выбрать орудие (интерактивно).
🔹 <code>/charge</code> — Задать заряд или включить автовыбор.
🔹 <code>/presets</code> — Просмотр сохраненных точек (ориентиров).
🔹 <code>/save [название] [grid] [Alt]</code> — Сохранить точку ориентира.

🔹 <code>/calc [gun_grid] [target_grid]</code> — Быстрый разовый расчет без сохранения профиля.
<i>Пример: <code>/calc 024036 028045</code></i>

<i>Текущее орудие: <b>${weapons.find(w => w.id === state.activeWeaponId)?.name || "M252"}</b></i>
<i>Заряд: <b>${state.activeChargeId === "auto" ? "Автовыбор" : "Заряд " + state.activeChargeId}</b></i>
<i>Орудие развернуто на: <code>${formatFullGrid(state.activeGun)}</code></i>
───────────────────
Отправь <code>/help</code> для полной справки.`;

  bot.sendMessage(msg.chat.id, helpText, { parse_mode: "HTML" });
});

// Command: /help
bot.onText(/\/help/, (msg) => {
  const helpText = `${HUD_HEADER}📖 <b>ПОЛНОЕ РУКОВОДСТВО FDC-БОТА:</b>

<b>1️⃣ Управление орудием:</b>
• <code>/setgun 024036 120</code> — Задает позицию орудия по 6-значному гриду и высоте 120 метров.
• <code>/setgun 2450 3680 120</code> — Альтернативно вводит точные координаты в метрах (X=2450, Y=3680).
• <code>/weapon</code> — Переключает орудия через инлайновые кнопки.
• <code>/charge</code> — Меняет режим подбора заряда (Авто или принудительный).

<b>2️⃣ Ведение огня и расчеты:</b>
• <code>/fire 028045 150</code> — Считает Азимут, Прицел и Время полета от твоей текущей пушки до указанной цели. Запоминает эту цель для возможной корректировки.
• <code>/calc 024036 028045 100 150</code> — Моментальный расчет между любыми двумя координатами (Формат: <code>/calc [орудие] [цель] [высота_орудия] [высота_цели]</code>).

<b>3️⃣ Корректировка огня:</b>
• После выстрела введи <code>/correct 027044 140</code> (куда реально упал снаряд). Бот выдаст поправку (например, <i>"Дальность +40, Влево 12"</i>) и рассчитает новую, скорректированную цель для 100% попадания!

<b>4️⃣ База ориентиров:</b>
• <code>/save airbase 016073 120</code> — Сохранить координаты под именем 'airbase'.
• <code>/presets</code> — Список твоих сохраненных точек.
• <code>/fire airbase</code> — Стрельба по сохраненному ориентиру!`;

  bot.sendMessage(msg.chat.id, helpText, { parse_mode: "HTML" });
});

// Command: /setgun
bot.onText(/\/setgun(?:\s+(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const state = getUserState(msg.from.id);
  const argsStr = match[1];

  if (!argsStr) {
    return bot.sendMessage(chatId, `${HUD_HEADER}⚠️ <b>Неверный формат!</b>\nИспользуй: <code>/setgun [grid/X Y] [Alt]</code>\nПример: <code>/setgun 024036 120</code>`, { parse_mode: "HTML" });
  }

  const parts = argsStr.trim().split(/\s+/);
  let coords = null;
  let alt = 0;

  // Check if the last argument is altitude
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
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Ошибка парсинга координат!</b>\nУбедись, что вводишь корректный грид (например <code>024036</code>) или метры.`, { parse_mode: "HTML" });
  }

  state.activeGun = { x: coords.x, y: coords.y, z: alt };
  bot.sendMessage(chatId, `${HUD_HEADER}✅ <b>ПОЗИЦИЯ ОРУДИЯ ОБНОВЛЕНА!</b>\n📍 Координаты: <code>${formatFullGrid(state.activeGun)}</code>`, { parse_mode: "HTML" });
});

// Command: /weapon
bot.onText(/\/weapon/, (msg) => {
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
  const chatId = msg.chat.id;
  const state = getUserState(msg.from.id);
  const wpn = weapons.find(w => w.id === state.activeWeaponId);

  if (!wpn) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Сначала выбери орудие через /weapon!</b>`, { parse_mode: "HTML" });
  }

  // Get charges for first ammunition
  const ammo = wpn.ammo[0];
  const buttons = [[{ text: "⚡ АВТОВЫБОР (Оптимальный)", callback_data: "chg_auto" }]];
  ammo.charges.forEach((c) => {
    buttons.push([{ text: `🔋 ${c.label}`, callback_data: `chg_${c.id}` }]);
  });

  bot.sendMessage(chatId, `${HUD_HEADER}🔋 <b>ВЫБЕРИ СИЛУ ЗАРЯДА:</b>\nОрудие: <i>${wpn.name}</i>`, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons }
  });
});

// Command: /save
bot.onText(/\/save(?:\s+(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const state = getUserState(msg.from.id);
  const argsStr = match[1];

  if (!argsStr) {
    return bot.sendMessage(chatId, `${HUD_HEADER}⚠️ <b>Использование:</b> <code>/save [название] [grid] [Alt]</code>\nПример: <code>/save btr_target 016073 80</code>`, { parse_mode: "HTML" });
  }

  const parts = argsStr.trim().split(/\s+/);
  if (parts.length < 2) {
    return bot.sendMessage(chatId, `${HUD_HEADER}⚠️ <b>Недостаточно аргументов!</b> Нужно название ориентира и координаты.`, { parse_mode: "HTML" });
  }

  const name = parts[0].toLowerCase();
  const coordStr = parts.slice(1).join(" ");
  
  // Check if last part is altitude
  let alt = 0;
  let parsedStr = coordStr;
  if (parts.length >= 3 && !isNaN(parts[parts.length - 1])) {
    alt = Number(parts[parts.length - 1]);
    parsedStr = parts.slice(1, -1).join(" ");
  }

  const coords = parseGridPair(parsedStr);
  if (!coords) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Ошибка координат!</b> Задай корректный грид.`, { parse_mode: "HTML" });
  }

  state.presets[name] = { x: coords.x, y: coords.y, z: alt };
  bot.sendMessage(chatId, `${HUD_HEADER}💾 <b>ОРИЕНТИР СОХРАНЕН!</b>\n🔑 Название: <b>${name}</b>\n📍 Координаты: <code>${formatFullGrid(state.presets[name])}</code>`, { parse_mode: "HTML" });
});

// Command: /presets
bot.onText(/\/presets/, (msg) => {
  const chatId = msg.chat.id;
  const state = getUserState(msg.from.id);
  const keys = Object.keys(state.presets);

  if (keys.length === 0) {
    return bot.sendMessage(chatId, `${HUD_HEADER}📭 <b>У тебя нет сохраненных ориентиров!</b> Используй <code>/save [name] [grid]</code>`, { parse_mode: "HTML" });
  }

  let text = `${HUD_HEADER}🗺️ <b>БАЗА ТАКТИЧЕСКИХ ОРИЕНТИРОВ:</b>\n\n`;
  keys.forEach((k) => {
    const p = state.presets[k];
    text += `🔸 <b>${k}</b>: <code>${formatGrid(p.x, 3)} ${formatGrid(p.y, 3)}</code> (Alt: ${p.z}m)\n<i>Расчет: <code>/fire ${k}</code></i>\n\n`;
  });

  bot.sendMessage(chatId, text, { parse_mode: "HTML" });
});

// Callback Query Handler (Inline keyboards)
bot.on("callback_query", (query) => {
  const data = query.data;
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const state = getUserState(userId);

  bot.answerCallbackQuery(query.id);

  if (data.startsWith("wpn_")) {
    const wpnId = data.substring(4);
    const wpn = weapons.find(w => w.id === wpnId);
    if (wpn) {
      state.activeWeaponId = wpnId;
      state.activeChargeId = "auto"; // reset charge to auto
      bot.sendMessage(chatId, `${HUD_HEADER}🛰️ <b>ОРУЖЕЙНАЯ СИСТЕМА ИЗМЕНЕНА:</b>\n🔫 Выбрано: <b>${wpn.name}</b>\n⚡ Заряд сброшен в <b>Автовыбор</b>.`, { parse_mode: "HTML" });
    }
  }

  if (data.startsWith("chg_")) {
    const chgId = data.substring(4);
    state.activeChargeId = chgId;
    bot.sendMessage(chatId, `${HUD_HEADER}🔋 <b>СИЛА ЗАРЯДА ИЗМЕНЕНА:</b>\n⚡ Установлен: <b>${chgId === "auto" ? "АВТОВЫБОР (оптимальный)" : "Заряд " + chgId}</b>`, { parse_mode: "HTML" });
  }
});

// Command: /fire
bot.onText(/\/fire(?:\s+(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const state = getUserState(msg.from.id);
  const argsStr = match[1];

  if (!argsStr) {
    return bot.sendMessage(chatId, `${HUD_HEADER}⚠️ <b>Использование:</b> <code>/fire [grid/X Y/ориентир] [Alt]</code>\nПример: <code>/fire 028045 150</code> или <code>/fire everon_airport</code>`, { parse_mode: "HTML" });
  }

  const parts = argsStr.trim().split(/\s+/);
  let target = null;
  let alt = 0;
  let targetName = "";

  // Check if first arg is a saved preset
  const presetName = parts[0].toLowerCase();
  if (state.presets[presetName]) {
    const p = state.presets[presetName];
    target = { x: p.x, y: p.y, z: p.z };
    targetName = ` ориентир [${presetName}]`;
    alt = p.z;
    if (parts.length === 2) {
      alt = Number(parts[1]) || p.z;
      target.z = alt;
    }
  } else {
    // Parse normal grid
    if (parts.length === 2 && parts[0].length >= 6) {
      target = parseGridPair(parts[0]);
      alt = Number(parts[1]) || 0;
    } else if (parts.length === 3) {
      target = parseGridPair(`${parts[0]} ${parts[1]}`);
      alt = Number(parts[2]) || 0;
    } else {
      target = parseGridPair(parts.join(" "));
    }
    if (target) {
      target.z = alt;
    }
  }

  if (!target) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Ошибка!</b>\nНе найден ориентир или координаты введены неверно.\nИспользуй грид (e.g. <code>028045</code>).`, { parse_mode: "HTML" });
  }

  const weapon = weapons.find(w => w.id === state.activeWeaponId);
  if (!weapon) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Ошибка: Выбранное орудие не найдено в базе!</b>`, { parse_mode: "HTML" });
  }

  const ammo = weapon.ammo[0];
  const range = dist2D(state.activeGun, target);
  
  // Decide charge ID
  let chargeId = state.activeChargeId;
  if (chargeId === "auto") {
    const opt = pickOptimalCharge(ammo, range);
    if (!opt) {
      return bot.sendMessage(chatId, `${HUD_HEADER}⚠️ <b>ЦЕЛЬ ВНЕ ДИСТАНЦИИ СТРЕЛЬБЫ!</b>\n🎯 Дистанция: <b>${range.toFixed(0)}м</b>\n🔫 Орудие: <i>${weapon.name}</i>\nНи один заряд не покрывает эту дальность.`, { parse_mode: "HTML" });
    }
    chargeId = opt;
  }

  const sol = computeSolution(weapon, ammo, chargeId, state.activeGun, target);
  if (!sol) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Ошибка расчета решения!</b>`, { parse_mode: "HTML" });
  }

  // Save states
  state.lastTarget = { ...target };
  state.lastSolution = { ...sol };

  // Format response message
  let resText = `${HUD_HEADER}💥 <b>ОГНЕВОЙ РАСЧЕТ FDC ДЛЯ ЦЕЛИ${targetName.toUpperCase()}:</b>

🔫 Система: <b>${weapon.name}</b>
🔋 Заряд: <b>${sol.chargeLabel}</b>
🎯 Дистанция: <b>${sol.rangeM.toFixed(0)} м</b>
🧭 Траектория: <b>${sol.arc === "high" ? "Мортирная (крутая)" : "Настильная (пологая)"}</b>
───────────────────
🧭 <b>НАПРАВЛЕНИЕ (AZIMUTH):</b>
👉 <b><code>${sol.bearingMil.toFixed(0)}</code> mils</b> (NATO)
👉 <code>${sol.bearingDeg.toFixed(1)}°</code> градусов

📐 <b>ПРИЦЕЛ (ELEVATION):</b>
👉 <b><code>${sol.elevationMil.toFixed(0)}</code> mils</b> (NATO)

⏱️ <b>ВРЕМЯ ПОЛЕТА (TOF):</b>
👉 <b><code>${sol.tofSec.toFixed(1)}</code> сек</b>
───────────────────
📢 <b>РАДИОКОМАНДА СТРЕЛКУ:</b>
<code>ЦЕЛЬ ${formatGrid(target.x, 3)}${formatGrid(target.y, 3)}, ЗАРЯД ${sol.chargeId}, НАПРАВЛЕНИЕ ${sol.bearingMil.toFixed(0)}, ПРИЦЕЛ ${sol.elevationMil.toFixed(0)}, ВРЕМЯ ПОЛЕТА ${sol.tofSec.toFixed(0)} СЕКУНД</code>
───────────────────
`;

  if (sol.warnings.length > 0) {
    resText += `⚠️ <b>ПРЕДУПРЕЖДЕНИЯ FDC:</b>\n`;
    sol.warnings.forEach(w => {
      resText += `• <i>${w}</i>\n`;
    });
  } else {
    resText += `🟢 <i>Баллистические параметры в норме. Расчет 100% точен.</i>`;
  }

  bot.sendMessage(chatId, resText, { parse_mode: "HTML" });
});

// Command: /calc
bot.onText(/\/calc(?:\s+(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const state = getUserState(msg.from.id);
  const argsStr = match[1];

  if (!argsStr) {
    return bot.sendMessage(chatId, `${HUD_HEADER}⚠️ <b>Пример быстрого расчета:</b>\n<code>/calc [grid_орудия] [grid_цели] [высота_орудия] [высота_цели]</code>\nПример: <code>/calc 024036 028045 120 150</code>`, { parse_mode: "HTML" });
  }

  const parts = argsStr.trim().split(/\s+/);
  if (parts.length < 2) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Ошибка! Недостаточно аргументов.</b>`, { parse_mode: "HTML" });
  }

  const gunPos = parseGridPair(parts[0]);
  const tarPos = parseGridPair(parts[1]);

  if (!gunPos || !tarPos) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Ошибка парсинга гридов!</b> Убедись, что вводишь координаты вроде <code>024036</code>.`, { parse_mode: "HTML" });
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
    return bot.sendMessage(chatId, `${HUD_HEADER}⚠️ <b>ЦЕЛЬ ВНЕ ДИСТАНЦИИ СТРЕЛЬБЫ!</b>\nДистанция: ${range.toFixed(0)}м\nНи один заряд не покрывает дальность.`, { parse_mode: "HTML" });
  }

  const sol = computeSolution(weapon, ammo, opt, gun, target);
  if (!sol) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Ошибка расчета решения!</b>`, { parse_mode: "HTML" });
  }

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

  bot.sendMessage(chatId, text, { parse_mode: "HTML" });
});

// Command: /correct
bot.onText(/\/correct(?:\s+(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const state = getUserState(msg.from.id);
  const argsStr = match[1];

  if (!state.lastTarget || !state.lastSolution) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Сначала сделай выстрел с помощью /fire!</b>\nБот должен знать параметры последней цели, чтобы рассчитать поправку.`, { parse_mode: "HTML" });
  }

  if (!argsStr) {
    return bot.sendMessage(chatId, `${HUD_HEADER}⚠️ <b>Использование:</b> <code>/correct [grid/X Y] [Alt]</code>\nПример: <code>/correct 027044 140</code> (введи грид, куда реально приземлился снаряд)`, { parse_mode: "HTML" });
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
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Ошибка! Не удалось распознать координаты точки попадания.</b>`, { parse_mode: "HTML" });
  }
  impact.z = alt;

  const delta = correctionDelta(state.activeGun, state.lastTarget, impact);
  const corrected = correctedTarget(state.lastTarget, impact);

  // Remember corrected target as a pending mirror action
  state.pendingCorrected = corrected;

  let text = `${HUD_HEADER}🎯 <b>КОРРЕКТИРОВКА ОГНЕВОЙ ПОЗИЦИИ (SPOTTER):</b>

📍 Прежняя цель: <code>${formatFullGrid(state.lastTarget)}</code>
💥 Точка попадания: <code>${formatFullGrid(impact)}</code>
───────────────────
📏 <b>ОТКЛОНЕНИЯ ОТ ЦЕЛИ:</b>
• <b>По дальности:</b> ${delta.alongM >= 0 ? `➕ <b>ПЕРЕЛЕТ</b> на <b>${delta.alongM.toFixed(0)}м</b> (надо убавить)` : `➖ <b>НЕДОЛЕТ</b> на <b>${Math.abs(delta.alongM).toFixed(0)}м</b> (надо добавить)`}
• <b>Боковое (деривация):</b> ${delta.crossM >= 0 ? `👉 <b>ПРАВЕЕ</b> на <b>${delta.crossM.toFixed(0)}м</b> (надо довернуть влево)` : `👈 <b>ЛЕВЕЕ</b> на <b>${Math.abs(delta.crossM).toFixed(0)}м</b> (надо довернуть вправо)`}
───────────────────
📢 <b>КОМАНДА КОРРЕКЦИИ ДЛЯ СТРЕЛКА:</b>
👉 <b>${delta.alongM >= 0 ? `УБАВИТЬ ${delta.alongM.toFixed(0)}м` : `ДОБАВИТЬ ${Math.abs(delta.alongM).toFixed(0)}м`}</b>
👉 <b>${delta.crossM >= 0 ? `ДОВЕРНУТЬ ВЛЕВО на ${Math.abs(delta.crossM * 0.5).toFixed(0)}м (или пересчитать)` : `ДОВЕРНУТЬ ВПРАВО на ${Math.abs(delta.crossM * 0.5).toFixed(0)}м`}</b>
───────────────────
🗺️ <b>СКОРРЕКТИРОВАННАЯ ЦЕЛЬ (ЗЕРКАЛЬНАЯ):</b>
👉 Грид: <code>${formatGrid(corrected.x, 3)} ${formatGrid(corrected.y, 3)}</code> (Высота: ${corrected.z.toFixed(0)}м)

<i>Чтобы немедленно рассчитать огневое решение по скорректированной цели, введи:</i>
👉 /mirror`;

  bot.sendMessage(chatId, text, { parse_mode: "HTML" });
});

// Command: /mirror
bot.onText(/\/mirror/, (msg) => {
  const chatId = msg.chat.id;
  const state = getUserState(msg.from.id);

  if (!state.pendingCorrected) {
    return bot.sendMessage(chatId, `${HUD_HEADER}❌ <b>Нет сохраненной скорректированной цели!</b>\nСначала введи поправку с помощью /correct.`, { parse_mode: "HTML" });
  }

  const corrected = state.pendingCorrected;
  state.pendingCorrected = null; // Consume it

  // Setup as a target and calculate
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

  let text = `${HUD_HEADER}🎯 <b>ВЫСТРЕЛ ПО СКОРРЕКТИРОВАННОЙ ЦЕЛИ (ВТОРОЙ ВЫСТРЕЛ):</b>

📍 Цель: <code>${formatFullGrid(corrected)}</code>
📏 Дистанция: <b>${sol.rangeM.toFixed(0)} м</b>
🔋 Заряд: <b>${sol.chargeLabel}</b>
───────────────────
🧭 <b>НАПРАВЛЕНИЕ:</b> <b><code>${sol.bearingMil.toFixed(0)}</code> mils</b>
📐 <b>ПРИЦЕЛ (ELEVATION):</b> <b><code>${sol.elevationMil.toFixed(0)}</code> mils</b>
⏱️ <b>TOF (ВРЕМЯ ПОЛЕТА):</b> <b><code>${sol.tofSec.toFixed(1)}</code> сек</b>
───────────────────
📢 <b>РАДИОКОМАНДА СТРЕЛКУ:</b>
<code>ЦЕЛЬ ${formatGrid(corrected.x, 3)}${formatGrid(corrected.y, 3)}, ЗАРЯД ${sol.chargeId}, НАПРАВЛЕНИЕ ${sol.bearingMil.toFixed(0)}, ПРИЦЕЛ ${sol.elevationMil.toFixed(0)}, ВРЕМЯ ПОЛЕТА ${sol.tofSec.toFixed(0)} СЕКУНД</code>
`;

  bot.sendMessage(chatId, text, { parse_mode: "HTML" });
});
