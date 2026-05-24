import type { FireSolution, Point3D } from '../types';
import { bearingDeg, degToMil, distance2D, distance3D } from './coordinates';
import { chooseBestCharge, interpolateBallistic } from './ballistics';
import { getAmmo, getCharge, getWeapon } from './weapons';

export interface SolveRequest {
  weaponId: string;
  ammoId: string;
  /** If null, the best charge for the range is auto-selected. */
  chargeId: string | null;
  gun: Point3D;
  target: Point3D;
}

export interface SolveResult {
  solution: FireSolution | null;
  error?: string;
  /** Final charge picked (useful when caller passed null). */
  chargeId: string | null;
}

export function solveFireMission(req: SolveRequest): SolveResult {
  const weapon = getWeapon(req.weaponId);
  if (!weapon) return { solution: null, chargeId: null, error: 'Unknown weapon' };
  const ammo = getAmmo(req.weaponId, req.ammoId);
  if (!ammo) return { solution: null, chargeId: null, error: 'Unknown ammunition' };

  const rangeFlat = distance2D(req.gun, req.target);
  const rangeSlant = distance3D(req.gun, req.target);
  const bDeg = bearingDeg(req.gun, req.target);
  const bMil = degToMil(bDeg);

  let chargeId = req.chargeId;
  if (!chargeId) {
    const pick = chooseBestCharge(ammo, rangeFlat);
    chargeId = pick ? pick.charge.id : ammo.charges[0]?.id ?? null;
  }
  if (!chargeId) return { solution: null, chargeId: null, error: 'No charges defined' };

  const charge = getCharge(req.weaponId, req.ammoId, chargeId);
  if (!charge) return { solution: null, chargeId, error: 'Unknown charge' };

  const interp = interpolateBallistic(charge.table, rangeFlat);

  const solution: FireSolution = {
    rangeFlat,
    rangeSlant,
    bearingDeg: bDeg,
    bearingMils: bMil,
    elevationMils: interp.elevation_mil,
    timeOfFlight: interp.time_of_flight_sec,
    chargeId,
    ammoId: req.ammoId,
    weaponId: req.weaponId,
    inRange: interp.inRange,
    minRange: interp.minRange,
    maxRange: interp.maxRange,
    interpolated: interp.interpolated,
    highAngle: interp.elevation_mil >= 800,
  };

  return { solution, chargeId };
}

/**
 * Given the *intended* target and the *actual* impact, compute a corrected
 * aimpoint for the next shot. We mirror the impact across the target:
 *   correctedAim = target + (target - impact)
 *
 * This is the simplest, most robust spotter correction — equivalent to "add
 * the miss vector back the other way." Caller then re-runs solveFireMission
 * against the corrected aimpoint to get the new bearing/elevation.
 */
export function correctedAimpoint(target: Point3D, impact: Point3D): Point3D {
  return {
    x: target.x + (target.x - impact.x),
    y: target.y + (target.y - impact.y),
    z: target.z + (target.z - impact.z),
  };
}

export interface SpotterDelta {
  add_m: number; // along the gun-target line: + = add range, - = drop
  right_m: number; // perpendicular: + = right, - = left
  up_m: number;
  totalMiss_m: number;
}

/**
 * Decompose the impact-vs-target miss into the gunner's frame of reference:
 *   ADD/DROP (along the firing line) and LEFT/RIGHT (perpendicular).
 */
export function spotterDelta(gun: Point3D, target: Point3D, impact: Point3D): SpotterDelta {
  const dx = target.x - gun.x;
  const dy = target.y - gun.y;
  const range = Math.hypot(dx, dy) || 1;
  // Unit vector "downrange" in world XY:
  const ux = dx / range;
  const uy = dy / range;
  // Unit vector "right" of downrange (90° clockwise of downrange in north-up XY):
  // downrange = (ux, uy); right = (uy, -ux)
  const rx = uy;
  const ry = -ux;

  const mx = impact.x - target.x;
  const my = impact.y - target.y;

  const along = mx * ux + my * uy; // + = impact landed *past* target
  const lateral = mx * rx + my * ry; // + = impact landed *right* of target

  return {
    add_m: -along, // we need to ADD `-along` to push the next shot back onto target
    right_m: -lateral,
    up_m: target.z - impact.z,
    totalMiss_m: Math.hypot(mx, my, target.z - impact.z),
  };
}
