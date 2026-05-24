import type { AmmoData, BallisticEntry, ChargeData } from '../types';

export interface InterpolationResult {
  elevation_mil: number;
  time_of_flight_sec: number;
  inRange: boolean;
  minRange: number;
  maxRange: number;
  interpolated: boolean;
}

/**
 * Pure linear interpolation of (elevation, ToF) from a ballistic table for the
 * given horizontal range. Assumes the table is sorted ascending by range.
 *
 * We pick the high-angle branch by default: most artillery tables list the
 * descending elevation values as range grows (1245 -> 800 in M777 Charge 1).
 * That's already the high-angle solution, so we just walk the table in order.
 */
export function interpolateBallistic(table: BallisticEntry[], range: number): InterpolationResult {
  if (table.length === 0) {
    return {
      elevation_mil: NaN,
      time_of_flight_sec: NaN,
      inRange: false,
      minRange: 0,
      maxRange: 0,
      interpolated: false,
    };
  }

  const minRange = table[0][0];
  const maxRange = table[table.length - 1][0];

  // Out of range — clamp and report.
  if (range <= minRange) {
    return {
      elevation_mil: table[0][1],
      time_of_flight_sec: table[0][2],
      inRange: range >= minRange - 1e-6,
      minRange,
      maxRange,
      interpolated: false,
    };
  }
  if (range >= maxRange) {
    const last = table[table.length - 1];
    return {
      elevation_mil: last[1],
      time_of_flight_sec: last[2],
      inRange: range <= maxRange + 1e-6,
      minRange,
      maxRange,
      interpolated: false,
    };
  }

  // Find bracketing pair.
  for (let i = 0; i < table.length - 1; i++) {
    const [r0, e0, t0] = table[i];
    const [r1, e1, t1] = table[i + 1];
    if (range >= r0 && range <= r1) {
      const span = r1 - r0;
      const t = span === 0 ? 0 : (range - r0) / span;
      return {
        elevation_mil: e0 + (e1 - e0) * t,
        time_of_flight_sec: t0 + (t1 - t0) * t,
        inRange: true,
        minRange,
        maxRange,
        interpolated: true,
      };
    }
  }

  // Should not reach here.
  return {
    elevation_mil: NaN,
    time_of_flight_sec: NaN,
    inRange: false,
    minRange,
    maxRange,
    interpolated: false,
  };
}

export interface ChargeChoice {
  charge: ChargeData;
  result: InterpolationResult;
  /** A lower score is better. 0 means the range sits right in the comfort band. */
  score: number;
}

/**
 * Pick the most "comfortable" charge for a given range. We prefer charges that:
 *   - Cover the range (range within [min, max])
 *   - Place the range in the middle of the table (high elevation ≈ steeper arc,
 *     better clearance over cover, more forgiving against terrain).
 *
 * Comfort metric: how close to the *upper* portion of the elevation band the
 * solution lands. Charges where the range falls near the max end-of-table
 * (low elevation, near-flat arc) are penalised — exactly the scenario the
 * brief warns about ("Charge 2 at 2500m: too low an angle").
 */
export function chooseBestCharge(ammo: AmmoData, range: number): ChargeChoice | null {
  if (!ammo.charges.length) return null;

  const candidates: ChargeChoice[] = ammo.charges.map((charge) => {
    const result = interpolateBallistic(charge.table, range);
    let score = Number.POSITIVE_INFINITY;

    if (result.inRange) {
      const span = result.maxRange - result.minRange || 1;
      // 0 at min range, 1 at max range. Anything > 0.85 = uncomfortably flat.
      const frac = (range - result.minRange) / span;
      // Sweet spot ~ 0.35–0.55 of the band.
      score = Math.abs(frac - 0.4);
      // Heavy penalty for being in the bottom 15% of the table (very flat arc).
      if (frac > 0.85) score += 1.5;
      // Mild bonus for higher elevation (steeper).
      score -= Math.min(0.2, result.elevation_mil / 8000);
    } else {
      // Out of range: rank by distance from the band.
      const dist =
        range < result.minRange ? result.minRange - range : range - result.maxRange;
      score = 10 + dist; // pushed below any in-range option
    }

    return { charge, result, score };
  });

  candidates.sort((a, b) => a.score - b.score);
  return candidates[0];
}

/** Convenience: ranges spanned across all charges for a single ammo. */
export function ammoRangeBand(ammo: AmmoData): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const c of ammo.charges) {
    if (!c.table.length) continue;
    min = Math.min(min, c.table[0][0]);
    max = Math.max(max, c.table[c.table.length - 1][0]);
  }
  return {
    min: Number.isFinite(min) ? min : 0,
    max: Number.isFinite(max) ? max : 0,
  };
}
