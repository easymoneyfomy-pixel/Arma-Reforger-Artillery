// Arma-style grid coordinates. Each axis is 0..worldSize meters.
// User inputs can be:
//   - plain meters (e.g. 4523)
//   - grid digits with implied precision (e.g. "045" -> 04500m for a 6-digit pair "045230" -> X=04500, Y=23000)
// We accept either.

export function parseAxis(input: string, worldSizeM = 12800): number | null {
  const s = input.trim();
  if (!s) return null;

  // If it's a raw meter coordinate (length > 4 or has decimal)
  if (/[.,]/.test(s) || s.length > 5) {
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? clamp(n, 0, worldSizeM) : null;
  }

  // Arma Grid Logic:
  // 2 digits: "04" -> 4000m
  // 3 digits: "045" -> 4500m
  // 4 digits: "0452" -> 4520m
  // 5 digits: "04523" -> 4523m
  
  let val: number;
  if (s.length <= 5) {
    const padded = s.padEnd(5, "0");
    val = Number(padded);
  } else {
    val = Number(s);
  }

  return Number.isFinite(val) ? clamp(val, 0, worldSizeM) : null;
}

// Parse a single grid pair like "016073" -> { x: 1600, y: 7300 } (3+3 digits).
// Supports 4, 6, 8, 10 digit concatenated grids.
export function parseGridPair(input: string, worldSizeM = 12800): { x: number; y: number } | null {
  const cleaned = input.replace(/[^0-9 ]/g, "").trim();
  if (!cleaned) return null;

  const parts = cleaned.split(/\s+/).filter(Boolean);

  // Space separated: "016 073"
  if (parts.length === 2) {
    const x = parseAxis(parts[0], worldSizeM);
    const y = parseAxis(parts[1], worldSizeM);
    if (x === null || y === null) return null;
    return { x, y };
  }

  // Concatenated: "016073"
  if (parts.length === 1) {
    const s = parts[0];
    if (s.length >= 4 && s.length % 2 === 0) {
      const half = s.length / 2;
      const xStr = s.slice(0, half);
      const yStr = s.slice(half);
      const x = parseAxis(xStr, worldSizeM);
      const y = parseAxis(yStr, worldSizeM);
      if (x === null || y === null) return null;
      return { x, y };
    }
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
