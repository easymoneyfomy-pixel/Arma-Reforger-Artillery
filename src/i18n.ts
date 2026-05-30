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
          correction: {
            title: "Impact Correction",
            clear: "Clear",
            impactX: "[X] Impact X",
            impactY: "[Y] Impact Y",
            impactZ: "[Z] Impact Z",
            rangeDelta: "Range delta",
            lateralDelta: "Lateral delta",
            apply: "Apply Correction"
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
            resume: "ПРОДОЛЖИТЬ",
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
            lof: "линия огня"
          },
          history: {
            title: "История миссий",
            clear: "Очистить",
            import: "Импорт",
            empty: "Нет сохраненных миссий."
          },
          correction: {
            title: "Корректировка удара",
            clear: "Очистить",
            impactX: "[X] Попадание X",
            impactY: "[Y] Попадание Y",
            impactZ: "[Z] Попадание Z",
            rangeDelta: "Отклонение по дальности",
            lateralDelta: "Боковое отклонение",
            apply: "Применить корректировку"
          }
        }
      }
    }
  });

export default i18n;
