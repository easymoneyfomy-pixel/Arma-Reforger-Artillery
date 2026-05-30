import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        translation: {
          header: {
            title: "Arma Reforger · Artillery FDC",
            subtitle: "Tactical Telemetry HUD",
            soundOn: "SOUND [ON]",
            soundOff: "SOUND [OFF]",
            premium: "PREMIUM",
            freeVersion: "FREE VERSION",
            reset: "Reset",
            help: "Help"
          },
          help: {
            title: "SYS: QUICK START GUIDE & MANUAL",
            subtitle: "Fire Direction Control · Arma Reforger Artillery Calculator",
            close: "Close [ESC]",
            acknowledge: "Acknowledge [ENTER]",
            quickStart: "QUICK START",
            step1: "1. DEPLOY GUN",
            step1Desc: "Select your weapon system and enter gun coordinates (X/Y/Z) or grid. Or click 'Place Gun' and click the map.",
            step2: "2. DESIGNATE TARGET",
            step2Desc: "Enter target coordinates or grid. Use 'Place Target' on map for fast designation.",
            step3: "3. EXECUTE MISSION",
            step3Desc: "Read Azimuth and Elevation from the right panel. Set Charge to 'AUTO' or pick manually.",
            features: "SYSTEM CAPABILITIES",
            standard: "STANDARD FEATURES (FREE)",
            premium: "PREMIUM FEATURES (LICENSED)",
            standardList: [
              "Ballistics for 81mm, 82mm, 120mm mortars",
              "Tactical map with coordinate readout",
              "Automatic charge selection",
              "Firing solution interpolation (Range/Azimuth/Elevation)",
              "Time of Flight countdown timer",
              "Mission history (local storage)"
            ],
            premiumList: [
              "Advanced ballistics: M119A2, D-30, M777, M109A6",
              "Wind correction & drift vector solvers",
              "Tactical landmarks & presets memory",
              "Real-time Battery Sync (Multiplayer)",
              "Impact correction & aim adjustment tools",
              "Map calibration for custom mod maps"
            ]
          },
          leftPanel: {
            weapon: "WEAPON SYSTEM",
            ammo: "AMMO TYPE",
            charge: "PROPELLANT CHARGE",
            autoCharge: "AUTO",
            gunPos: "GUN POSITION",
            targetPos: "TARGET POSITION",
            presets: "PRESETS",
            savePreset: "Save Preset",
            easting: "[X] Easting",
            northing: "[Y] Northing",
            altitude: "[Z] Altitude",
            gridString: "[G] Grid String (e.g. 016073)",
            meters: "meters",
            clear: "Clear"
          },
          rightPanel: {
            solution: "Firing Solution",
            online: "ONLINE",
            standby: "STANDBY",
            copy: "Copy",
            copied: "Copied",
            shared: "Shared!",
            share: "Share",
            saveMission: "Save Mission",
            range: "Range",
            tof: "Time of Flight",
            azimuth: "Azimuth",
            elevation: "Elevation",
            charge: "Charge",
            arc: "Arc",
            altDelta: "Δ Alt",
            warnings: "WARNINGS",
            timer: "Impact Countdown",
            tMinus: "T-MINUS",
            impact: "IMPACT!",
            startTimer: "START COUNTDOWN",
            pause: "PAUSE",
            resume: "RESUME",
            reset: "RESET",
            wind: "Wind Correction",
            windLocked: "MET WORKSTATION LOCKED",
            windLockedDesc: "Real-time headwind, crosswind, and drift vector solvers require premium authorization.",
            unlockPremium: "Unlock Premium",
            expandWind: "EXPAND WIND PANEL",
            collapseWind: "COLLAPSE WIND PANEL",
            windSpeed: "SPEED (M/S)",
            windDir: "DIRECTION (DEG)",
            drift: "ESTIMATED DRIFT",
            offset: "AIM OFFSET"
          },
          map: {
            title: "Tactical Map",
            upload: "Upload",
            placeGun: "Place Gun",
            placeTarget: "Place Target",
            swap: "Swap",
            rings: "Rings",
            cep: "CEP",
            calibrate: "Calibrate",
            north: "N",
            grid: "grid",
            placeHelp: "Click map to place {{mode}} (world size {{size}} m). Drag G/T to refine.",
            lof: "line of fire"
          },
          history: {
            title: "Mission History",
            clear: "Clear",
            import: "Import",
            empty: "No saved missions."
          },
          sync: {
            title: "Battery Sync",
            label: "Battery ID",
            join: "Join",
            leave: "Leave",
            connected: "CONNECTED",
            disconnected: "DISCONNECTED",
            status: "Status",
            idPlaceholder: "ROOM ID",
            help: "Sync markers with your battery in real-time.",
            locked: "NETWORK SYNC LOCKED",
            lockedDesc: "Real-time uplink for battery synchronization requires premium authorization."
          },
          correction: {
            title: "Impact Correction",
            clear: "Clear",
            impactX: "[X] Impact X",
            impactY: "[Y] Impact Y",
            impactZ: "[Z] Impact Z",
            rangeDelta: "Range delta",
            lateralDelta: "Lateral delta",
            apply: "Apply Correction",
            locked: "CORRECTION MODULE LOCKED",
            lockedDesc: "Advanced impact correction and mirror-aim algorithms require premium authorization."
          }
        }
      },
      ru: {
        translation: {
          header: {
            title: "Arma Reforger · Арт. вычислитель",
            subtitle: "Тактический телеметрический HUD",
            soundOn: "ЗВУК [ВКЛ]",
            soundOff: "ЗВУК [ВЫКЛ]",
            premium: "ПРЕМИУМ",
            freeVersion: "БЕСПЛАТНАЯ ВЕРСИЯ",
            reset: "Сброс",
            help: "Помощь"
          },
          help: {
            title: "SYS: РУКОВОДСТВО ПО ЭКСПЛУАТАЦИИ",
            subtitle: "Управление огнем · Артиллерийский вычислитель Arma Reforger",
            close: "Закрыть [ESC]",
            acknowledge: "Принять [ENTER]",
            quickStart: "БЫСТРЫЙ СТАРТ",
            step1: "1. ПОЗИЦИЯ ОРУДИЯ",
            step1Desc: "Выберите орудие и введите координаты (X/Y/Z) или сетку. Или нажмите 'Орудие' и кликните по карте.",
            step2: "2. УКАЗАНИЕ ЦЕЛИ",
            step2Desc: "Введите координаты цели. Используйте режим 'Цель' на карте для быстрого наведения.",
            step3: "3. ОГНЕВАЯ ЗАДАЧА",
            step3Desc: "Считайте Азимут и Прицел на правой панели. Поставьте Заряд на 'АВТО' или выберите вручную.",
            features: "ВОЗМОЖНОСТИ СИСТЕМЫ",
            standard: "БАЗОВЫЕ ФУНКЦИИ (БЕСПЛАТНО)",
            premium: "ПРЕМИУМ ФУНКЦИИ (ЛИЦЕНЗИЯ)",
            standardList: [
              "Баллистика для минометов 81мм, 82мм, 120мм",
              "Тактическая карта с чтением координат",
              "Автоматический выбор заряда",
              "Интерполяция решения (Дальность/Азимут/Прицел)",
              "Таймер обратного отсчета до попадания",
              "История миссий (локальное хранилище)"
            ],
            premiumList: [
              "Продвинутая баллистика: M119A2, D-30, M777, M109A6",
              "Расчет поправок на ветер и дрейф",
              "Тактические ориентиры и память пресетов",
              "Синхронизация батареи (Мультиплеер)",
              "Корректировка огня и инструменты доводки",
              "Калибровка для кастомных карт из модов"
            ]
          },
          leftPanel: {
            weapon: "СИСТЕМА ОРУДИЯ",
            ammo: "ТИП БОЕПРИПАСА",
            charge: "МЕТАТЕЛЬНЫЙ ЗАРЯД",
            autoCharge: "АВТО",
            gunPos: "ПОЗИЦИЯ ОРУДИЯ",
            targetPos: "ПОЗИЦИЯ ЦЕЛИ",
            presets: "ПРЕСЕТЫ",
            savePreset: "Сохранить пресет",
            easting: "[X] Координата X",
            northing: "[Y] Координата Y",
            altitude: "[Z] Высота",
            gridString: "[G] Сетка (напр. 016073)",
            meters: "метры",
            clear: "Очистить"
          },
          rightPanel: {
            solution: "Решение для стрельбы",
            online: "ГОТОВ",
            standby: "ОЖИДАНИЕ",
            copy: "Коп.",
            copied: "Готово",
            shared: "Ссылка!",
            share: "Поделиться",
            saveMission: "Сохранить миссию",
            range: "Дистанция",
            tof: "Время полёта",
            azimuth: "Азимут",
            elevation: "Прицел",
            charge: "Заряд",
            arc: "Траектория",
            altDelta: "Δ Выс.",
            warnings: "ПРЕДУПРЕЖДЕНИЯ",
            timer: "Таймер попадания",
            tMinus: "ДО УДАРА:",
            impact: "ПОПАДАНИЕ!",
            startTimer: "ЗАПУСТИТЬ ТАЙМЕР",
            pause: "ПАУЗА",
            resume: "ПРЕДУПРЕЖДЕНИЕ",
            reset: "СБРОС",
            wind: "Поправка на ветер",
            windLocked: "МЕТЕОСТАНЦИЯ ЗАБЛОКИРОВАНА",
            windLockedDesc: "Расчет векторов встречного, бокового ветра и дрейфа требует премиум-авторизации.",
            unlockPremium: "Разблокировать Премиум",
            expandWind: "РАСКРЫТЬ ПАНЕЛЬ ВЕТРА",
            collapseWind: "СВЕРНУТЬ ПАНЕЛЬ ВЕТРА",
            windSpeed: "СКОРОСТЬ (М/С)",
            windDir: "НАПРАВЛЕНИЕ (ГРАД)",
            drift: "ОЦЕНКА ДРЕЙФА",
            offset: "СМЕЩЕНИЕ ПРИЦЕЛИВАНИЯ"
          },
          map: {
            title: "Тактическая карта",
            upload: "Загрузить",
            placeGun: "Орудие",
            placeTarget: "Цель",
            swap: "Смена",
            rings: "Кольца",
            cep: "КВО",
            calibrate: "Калибровка",
            north: "С",
            grid: "сетка",
            placeHelp: "Нажмите на карту чтобы поставить {{mode}} (размер мира {{size}} м). Перетащите G/T для уточнения.",
            lof: "line of fire"
          },
          history: {
            title: "История миссий",
            clear: "Очистить",
            import: "Импорт",
            empty: "Нет сохраненных миссий."
          },
          sync: {
            title: "Синхронизация",
            label: "ID Батареи",
            join: "Войти",
            leave: "Выйти",
            connected: "ПОДКЛЮЧЕНО",
            disconnected: "ОТКЛЮЧЕНО",
            status: "Статус",
            idPlaceholder: "ID КОМНАТЫ",
            help: "Синхронизация меток с вашей батареей в реальном времени.",
            locked: "СИНХРОНИЗАЦИЯ ЗАБЛОКИРОВАНА",
            lockedDesc: "Передача данных для синхронизации батареи требует премиум-авторизации."
          },
          correction: {
            title: "Корректировка удара",
            clear: "Очистить",
            impactX: "[X] Попадание X",
            impactY: "[Y] Попадание Y",
            impactZ: "[Z] Попадание Z",
            rangeDelta: "Отклонение по дальности",
            lateralDelta: "Боковое отклонение",
            apply: "Применить корректировку",
            locked: "МОДУЛЬ КОРРЕКТИРОВКИ ЗАБЛОКИРОВАН",
            lockedDesc: "Продвинутые алгоритмы корректировки огня требуют премиум-авторизации."
          }
        }
      }
    }
  });

export default i18n;
