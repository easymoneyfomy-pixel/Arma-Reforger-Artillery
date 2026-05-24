# Arma Reforger — Artillery Computer

A tactical fire-control web app for Arma Reforger artillery. Computes
azimuth (mils + degrees), elevation (mils), and time-of-flight from gun and
target coordinates, against per-charge ballistic tables.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS (dark, monospace, MIL-spec UI)
- localStorage for mission log + custom maps (no backend)

## Features

- **Modular weapons / ammo / charges** stored as JSON (`src/data/weapons.json`),
  including the M777 with the full M107 HE ballistic table (Charges 1–5),
  base M252 81mm and 2B14 82mm mortars.
- **Linear interpolation** between table rows (`src/lib/ballistics.ts`) — so
  e.g. 1320 m on M777 Charge 1 returns elevation/ToF interpolated between
  the 1300 m and 1350 m rows.
- **Auto charge selection**: picks the charge whose effective band places the
  range in the comfortable middle of the arc and penalises near-flat solutions
  (the "Charge 2 at 2500 m" trap from the brief).
- **Coordinate parsing**: 4-digit / 6-digit / 8-digit grid strings
  (`016073`, `0160 0730`), raw meters, with automatic precision.
- **3D fire-solution math** (`src/lib/solver.ts`): flat + slant range, north-up
  compass bearing, elevation lookup, high/low-angle flag, in-range check.
- **Tactical map**: Everon and Arland (procedural placeholder backdrop +
  km grid), click to place gun or target.
- **Custom map upload**: drop in any top-down image and calibrate with two
  reference points (pixel→world affine).
- **Combat log**: every fire mission saved, one-click recall to load gun /
  target / charge back into the inputs.
- **Spotter correction**: enter the impact grid, get ADD/DROP & LEFT/RIGHT
  in the gunner's frame plus a freshly-solved corrected aimpoint.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Adding a new weapon

Append an entry to `src/data/weapons.json`:

```json
{
  "id": "your_weapon_id",
  "name": "Display Name",
  "family": "mortar",
  "caliber_mm": 60,
  "source": "mod",
  "ammo": [{
    "id": "ammo_id",
    "name": "HE round",
    "category": "HE",
    "charges": [{
      "id": "1",
      "label": "Charge 1",
      "table": [
        [200, 1480, 17.0],
        [500, 1320, 18.3]
      ]
    }]
  }]
}
```

Table rows are `[range_m, elevation_mil, time_of_flight_sec]`.
