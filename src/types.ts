export type Vec3 = { x: number; y: number; z: number };

export type BallisticRow = {
  range_m: number;
  elevation_mil: number;
  tof_sec: number;
};

export type ChargeTable = {
  id: string;
  label: string;
  rows: BallisticRow[];
};

export type Ammo = {
  id: string;
  name: string;
  description?: string;
  charges: ChargeTable[];
};

export type Weapon = {
  id: string;
  name: string;
  category: "mortar" | "howitzer" | "other";
  isMod?: boolean;
  faction?: string;
  minElevationMil?: number;
  maxElevationMil?: number;
  ammo: Ammo[];
};

export type MapDef = {
  id: string;
  name: string;
  worldSizeM: number;
  image: string;
  builtin: boolean;
  heightmap?: string;
  maxAltitude?: number;
  calibration?: {
  p1: { px: { x: number; y: number }; world: { x: number; y: number } };
  p2: { px: { x: number; y: number }; world: { x: number; y: number } };
  p3?: { px: { x: number; y: number }; world: { x: number; y: number } };
  };

};

export type FiringSolution = {
  rangeM: number;
  bearingMil: number;
  bearingDeg: number;
  elevationMil: number;
  tofSec: number;
  chargeId: string;
  chargeLabel: string;
  ammoId: string;
  weaponId: string;
  warnings: string[];
  arc: "high" | "low" | "flat";
  altDeltaM: number;
};

export type Mission = {
  id: string;
  ts: number;
  label: string;
  weaponId: string;
  ammoId: string;
  chargeId: string;
  gun: Vec3;
  target: Vec3;
  solution: FiringSolution;
};
