import type { Point2D, Point3D } from '../types';

/**
 * Parse an Arma/MGRS-style grid string into world meters (X, Y).
 *
 * Examples:
 *   "0160 0730"    -> { x: 1600,  y: 7300 }    (4-digit per axis, 10 m precision)
 *   "016073"       -> { x: 1600,  y: 7300 }    (3-digit per axis, 100 m precision)
 *   "01600730"     -> { x: 1600,  y: 7300 }    (4-digit per axis, no separator)
 *   "1600 7300"    -> { x: 1600,  y: 7300 }    (raw meters)
 *   "1600,7300"    -> { x: 1600,  y: 7300 }
 *
 * Returns null if the input cannot be parsed.
 *
 * The grid encoding follows the standard map-grid convention:
 *   - Equal number of digits per axis
 *   - Each pair of digits is one decimal of precision (1 km / 100 m / 10 m / 1 m)
 */
export function parseGrid(input: string): Point2D | null {
  if (!input) return null;
  const cleaned = input.trim();

  // Form A: two numbers separated by space/comma/slash → already meters
  const sepMatch = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*[\s,;/x]+\s*(-?\d+(?:\.\d+)?)$/);
  if (sepMatch) {
    return { x: parseFloat(sepMatch[1]), y: parseFloat(sepMatch[2]) };
  }

  // Form B: a single digit string. Must be even length, split in half.
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length >= 4 && digits.length % 2 === 0) {
    const half = digits.length / 2;
    const xStr = digits.slice(0, half);
    const yStr = digits.slice(half);
    // Precision: half=2 → 1 km, half=3 → 100 m, half=4 → 10 m, half=5 → 1 m.
    const precision = Math.pow(10, 5 - half);
    if (precision >= 1) {
      return {
        x: parseInt(xStr, 10) * precision,
        y: parseInt(yStr, 10) * precision,
      };
    }
    // For half=5 (10-digit input), treat as raw meters.
    return { x: parseInt(xStr, 10), y: parseInt(yStr, 10) };
  }

  return null;
}

/**
 * Format an (x, y) meter pair as a grid string of the given precision.
 * digits = digits per axis (typically 3, 4, or 5).
 */
export function formatGrid(p: Point2D, digits: number = 3): string {
  const precision = Math.pow(10, 5 - digits);
  const xStr = Math.max(0, Math.floor(p.x / precision)).toString().padStart(digits, '0');
  const yStr = Math.max(0, Math.floor(p.y / precision)).toString().padStart(digits, '0');
  return `${xStr} ${yStr}`;
}

/** Flat ground distance between two points (meters). */
export function distance2D(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Slant range including elevation difference. */
export function distance3D(a: Point3D, b: Point3D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Compass bearing from `from` -> `to` in degrees [0, 360).
 *
 * 0° is north (+Y); 90° is east (+X). This is the gunnery convention used by
 * in-game compasses; it differs from math atan2 which measures from the +X
 * axis CCW.
 */
export function bearingDeg(from: Point2D, to: Point2D): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const rad = Math.atan2(dx, dy); // note swapped args → north reference
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

export const MIL_PER_DEG = 6400 / 360;

export function degToMil(deg: number): number {
  let m = deg * MIL_PER_DEG;
  m = ((m % 6400) + 6400) % 6400;
  return m;
}

export function bearingMils(from: Point2D, to: Point2D): number {
  return degToMil(bearingDeg(from, to));
}

/** Format a mils value as a zero-padded 4-digit integer. */
export function fmtMil(m: number): string {
  return Math.round(m).toString().padStart(4, '0');
}

/** Format degrees as e.g. "094.3°". */
export function fmtDeg(d: number): string {
  return `${d.toFixed(1).padStart(5, '0')}°`;
}
