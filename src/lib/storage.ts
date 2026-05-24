const KEY_MISSIONS = "ar_fdc_missions_v1";
const KEY_MAPS = "ar_fdc_maps_v1";

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or disabled */
  }
}

export const STORAGE = {
  MISSIONS: KEY_MISSIONS,
  MAPS: KEY_MAPS,
};
