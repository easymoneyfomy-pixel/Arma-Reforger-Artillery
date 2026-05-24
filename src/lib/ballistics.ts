import type { BallisticRow, ChargeTable, Weapon, Ammo, FiringSolution, Vec3 } from "../types";
import { bearingRad, dist2D, radToDeg, radToMil } from "./coords";

export type InterpResult = {
  elevation_mil: number;
  tof_sec: number;
  inRange: boolean;
};

export function interpolateCharge(charge: ChargeTable, range: number): InterpResult | null {
  const rows = charge.rows;
  if (!rows.length) return null;
  // Below min or above max -> still return clamped value but inRange=false.
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Pick a charge that:
//  - covers the target range
//  - prefers higher elevation (better terrain clearance) -> i.e. lower charge if possible
// Returns the chosen charge id or null.
export function pickOptimalCharge(ammo: Ammo, range: number): string | null {
  // Score: prefer charges where the resulting elevation is high (>= 900 mil) but not the very edge.
  let best: { id: string; score: number } | null = null;
  for (const c of ammo.charges) {
    const r = interpolateCharge(c, range);
    if (!r || !r.inRange) continue;
    // Penalize charges where elevation is too low (< 850 mil) — flat trajectory
    // and where elevation is at the absolute top (>1250 mil — edge of usable arc)
    const elev = r.elevation_mil;
    let score = 0;
    if (elev < 800) score -= 200 + (800 - elev);
    else if (elev > 1250) score -= 50 + (elev - 1250);
    else score += 100 - Math.abs(elev - 1050) * 0.1;
    // Slight bonus for lower charge (more arc, less drift)
    score += (10 - parseInt(c.id, 10)) * 2;
    if (!best || score > best.score) best = { id: c.id, score };
  }
  return best ? best.id : null;
}

export function chargeRangeBand(charge: ChargeTable): { min: number; max: number } {
  const rs = charge.rows;
  return { min: rs[0].range_m, max: rs[rs.length - 1].range_m };
}

export function computeSolution(
  weapon: Weapon,
  ammo: Ammo,
  chargeId: string,
  gun: Vec3,
  target: Vec3,
): FiringSolution | null {
  const charge = ammo.charges.find((c) => c.id === chargeId);
  if (!charge) return null;
  const ground = dist2D(gun, target);
  // For tabular ballistics we use ground (2D) range as the input. Altitude
  // delta is reported separately as a warning since these tables assume
  // gun and target at similar elevations.
  const interp = interpolateCharge(charge, ground);
  const bRad = bearingRad(gun, target);
  const warnings: string[] = [];
  if (!interp) return null;
  if (!interp.inRange) {
    const band = chargeRangeBand(charge);
    if (ground < band.min) warnings.push(`Range ${ground.toFixed(0)}m below charge min ${band.min}m`);
    if (ground > band.max) warnings.push(`Range ${ground.toFixed(0)}m above charge max ${band.max}m`);
  }
  const dz = target.z - gun.z;
  if (Math.abs(dz) >= 25) {
    warnings.push(`Altitude delta ${dz >= 0 ? "+" : ""}${dz.toFixed(0)}m — tables assume level terrain`);
  }
  return {
    rangeM: ground,
    bearingMil: radToMil(bRad),
    bearingDeg: radToDeg(bRad),
    elevationMil: interp.elevation_mil,
    tofSec: interp.tof_sec,
    chargeId: charge.id,
    chargeLabel: charge.label,
    ammoId: ammo.id,
    weaponId: weapon.id,
    warnings,
  };
}

// Compute corrected aim point given:
//  - planned target
//  - observed impact
// Output: corrected target = target + (target - impact), i.e. mirror the miss.
export function correctedTarget(target: Vec3, impact: Vec3): Vec3 {
  return {
    x: target.x + (target.x - impact.x),
    y: target.y + (target.y - impact.y),
    z: target.z,
  };
}

// Build the line-of-fire delta produced by a miss, expressed in the gun's
// reference frame: along-axis (over/short) and cross-axis (left/right).
export function correctionDelta(
  gun: Vec3,
  target: Vec3,
  impact: Vec3,
): { rangeM: number; alongM: number; crossM: number } {
  const dxT = target.x - gun.x;
  const dyT = target.y - gun.y;
  const len = Math.hypot(dxT, dyT) || 1;
  const ux = dxT / len;
  const uy = dyT / len;
  // perpendicular (right-hand)
  const rx = uy;
  const ry = -ux;
  const dxI = impact.x - target.x;
  const dyI = impact.y - target.y;
  return {
    rangeM: Math.hypot(impact.x - gun.x, impact.y - gun.y),
    alongM: dxI * ux + dyI * uy, // + = over the target, - = short
    crossM: dxI * rx + dyI * ry, // + = right, - = left
  };
}
