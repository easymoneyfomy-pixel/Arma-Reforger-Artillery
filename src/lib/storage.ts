import type { FireMission, MapData } from '../types';

const MISSION_KEY = 'arty.missions.v1';
const MAPS_KEY = 'arty.customMaps.v1';

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or unavailable — silently drop */
  }
}

export function loadMissions(): FireMission[] {
  return safeGet<FireMission[]>(MISSION_KEY, []);
}
export function saveMissions(missions: FireMission[]) {
  safeSet(MISSION_KEY, missions.slice(0, 100));
}

export function loadCustomMaps(): MapData[] {
  return safeGet<MapData[]>(MAPS_KEY, []);
}
export function saveCustomMaps(maps: MapData[]) {
  safeSet(MAPS_KEY, maps);
}
