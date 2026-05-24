// Arma-style grid coordinates. Each axis is 0..worldSize meters.
// User inputs can be:
//   - plain meters (e.g. 4523)
//   - grid digits with implied precision (e.g. "045" -> 04500m for a 6-digit pair "045230" -> X=04500, Y=23000)
// We accept either.

export function parseAxis(input: string, worldSizeM = 12800): number | null {
  const s = input.trim();
  if (!s) return null;
  // If decimal or > 4 digits assume meters.
  if (/[.,]/.test(s) || s.length > 4) {
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? clamp(n, 0, worldSizeM) : null;
  }
  if (!/^\d+$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? clamp(n, 0, worldSizeM) : null;
  }
  // 1-4 digit grid: pad to 5 (each km is 1 leading digit, meters within km come from remaining digits).
  // We interpret the leading digit(s) as kilometers, then remaining as a fraction of km.
  // "04" -> 4 km. "045" -> 4.5 km. "0452" -> 4.52 km.
  let km: number;
  if (s.length === 1) km = Number(s);
  else if (s.length === 2) km = Number(s);
  else km = Number(s.slice(0, 2)) + Number(s.slice(2)) / Math.pow(10, s.length - 2);
  return clamp(km * 1000, 0, worldSizeM);
}

// Parse a single grid pair like "016073" -> { x: 1600, y: 7300 } (3+3 digits).
// Also accepts space/comma separated "016 073" or "x=016 y=073".
export function parseGridPair(input: string, worldSizeM = 12800): { x: number; y: number } | null {
  const cleaned = input.replace(/[^0-9 ,;\-/]/g, "").trim();
  if (!cleaned) return null;
  const parts = cleaned.split(/[\s,;/\-]+/).filter(Boolean);
  if (parts.length === 2) {
    const x = parseAxis(parts[0], worldSizeM);
    const y = parseAxis(parts[1], worldSizeM);
    if (x == null || y == null) return null;
    return { x, y };
  }
  // Single concatenated string: must be even length 2..10
  if (parts.length === 1 && parts[0].length >= 2 && parts[0].length % 2 === 0) {
    const half = parts[0].length / 2;
    const x = parseAxis(parts[0].slice(0, half), worldSizeM);
    const y = parseAxis(parts[0].slice(half), worldSizeM);
    if (x == null || y == null) return null;
    return { x, y };
  }
  return null;
}

export function formatGrid(m: number, digits = 3): string {
  const km = m / 1000;
  // Truncate to `digits` precision: e.g. 4523m, digits=3 -> "045"
  const factor = Math.pow(10, digits - 1);
  const v = Math.floor(km * factor);
  return v.toString().padStart(digits, "0");
}

export function dist2D(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

export function dist3D(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Bearing from `a` to `b`, North = +Y. Result in radians [0, 2π).
export function bearingRad(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  // atan2 with (dx, dy) gives angle clockwise from north
  const angle = Math.atan2(dx, dy);
  return (angle + 2 * Math.PI) % (2 * Math.PI);
}

export function radToMil(rad: number): number {
  // NATO mils: 6400 mils per full circle
  return (rad * 6400) / (2 * Math.PI);
}
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}
export function milToRad(mil: number): number {
  return (mil * 2 * Math.PI) / 6400;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
