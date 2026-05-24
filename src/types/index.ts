export type BallisticEntry = [range_m: number, elevation_mil: number, time_of_flight_sec: number];

export interface ChargeData {
  id: string;
  label: string;
  table: BallisticEntry[];
}

export interface AmmoData {
  id: string;
  name: string;
  category: 'HE' | 'SMOKE' | 'ILLUM' | 'WP' | 'AP' | 'OTHER';
  description?: string;
  charges: ChargeData[];
}

export interface WeaponData {
  id: string;
  name: string;
  family: 'mortar' | 'howitzer' | 'rocket';
  caliber_mm: number;
  faction?: string;
  source: 'base' | 'mod';
  ammo: AmmoData[];
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface FireSolution {
  rangeFlat: number; // 2D horizontal range, m
  rangeSlant: number; // 3D slant range, m
  bearingMils: number; // 0..6400
  bearingDeg: number; // 0..360
  elevationMils: number; // angle of fire, mils
  timeOfFlight: number; // seconds
  chargeId: string;
  ammoId: string;
  weaponId: string;
  inRange: boolean;
  minRange: number;
  maxRange: number;
  interpolated: boolean;
  highAngle: boolean; // > 800 mil ≈ 45°
}

export interface FireMission {
  id: string;
  timestamp: number;
  label?: string;
  weaponId: string;
  ammoId: string;
  chargeId: string;
  gun: Point3D;
  target: Point3D;
  solution: FireSolution;
}

export interface CustomMapCalibration {
  // Two reference points: pixel coords on the image + their in-game world XY (in meters).
  p1: { px: number; py: number; wx: number; wy: number };
  p2: { px: number; py: number; wx: number; wy: number };
}

export interface MapData {
  id: string;
  name: string;
  source: 'base' | 'custom';
  imageUrl: string;
  // For base maps: simple linear bounds. Origin is bottom-left.
  worldSize_m: number; // e.g. 12800 for Everon
  // Pixel dimensions of the image
  imgWidth: number;
  imgHeight: number;
  calibration?: CustomMapCalibration; // present for custom maps
}
