# Arma Reforger · Artillery FDC

Web-based fire-direction calculator for Arma Reforger artillery (mortars and modded howitzers).

## Stack
Vite + React 18 + TypeScript + Tailwind CSS. Pure client, data persisted in `localStorage`.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Features

- **Modular weapon catalog** — `src/data/weapons.json` lists weapons, ammo, charges and tabulated ballistic rows (`range_m`, `elevation_mil`, `tof_sec`). Ships with M252 81mm, M120 120mm, and M777 155mm (M107 HE charges 1–5).
- **Firing solution** — 2D range + bearing (mils & degrees), elevation via linear interpolation between adjacent table rows, time of flight, altitude-delta warnings.
- **Auto charge selection** — picks the charge that lands the target in a usable high-angle band (≈ 850–1250 mil), with bias toward the lowest charge that works (more arc / better cover-clearance).
- **Grid coordinates** — accepts raw meters or Arma-style grids like `016073` (auto-split by digit pairs).
- **Tactical map** — built-in Everon (12.8 km) and Arland (4.1 km) outlines, click to place gun / target. Upload any image as a custom mod map and **calibrate** it with two known world points; the calculator then maps pixels ↔ meters via that calibration.
- **Combat memory** — save / reload missions (gun + target + solution).
- **Impact correction** — input observed impact, get range/lateral delta in meters and mirror the miss back onto the aim point.

## Adding more weapons / charges

Drop a new entry into `src/data/weapons.json`. Each charge is a list of `[range_m, elevation_mil, tof_sec]` rows; rows are kept sorted by `range_m` and interpolated linearly between adjacent points.
