import { useEffect, useState } from 'react';
import { formatGrid, parseGrid } from '../lib/coordinates';
import type { Point2D } from '../types';

interface Props {
  label: string;
  value: Point2D;
  onChange: (next: Point2D) => void;
  /** digits per axis used when formatting back to grid. default 4 (10 m precision) */
  digits?: number;
}

/**
 * Combined grid + raw-XY editor. The user can either:
 *   - Type a grid string ("0160 0730", "016073", etc.)
 *   - Edit X and Y meters directly
 * They stay in sync; raw meters are authoritative state.
 */
export function GridInput({ label, value, onChange, digits = 4 }: Props) {
  const [grid, setGrid] = useState(() => formatGrid(value, digits));
  const [xStr, setXStr] = useState(() => Math.round(value.x).toString());
  const [yStr, setYStr] = useState(() => Math.round(value.y).toString());

  // External changes (e.g. map click) need to propagate down.
  useEffect(() => {
    setGrid(formatGrid(value, digits));
    setXStr(Math.round(value.x).toString());
    setYStr(Math.round(value.y).toString());
  }, [value.x, value.y, digits]);

  function commitGrid(raw: string) {
    setGrid(raw);
    const p = parseGrid(raw);
    if (p) onChange({ x: p.x, y: p.y });
  }

  function commitXY(nx: string, ny: string) {
    setXStr(nx);
    setYStr(ny);
    const x = parseFloat(nx);
    const y = parseFloat(ny);
    if (Number.isFinite(x) && Number.isFinite(y)) onChange({ x, y });
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="field-label !mb-0">{label}</label>
        <span className="text-[10px] text-muted">{digits * 2}-DIG</span>
      </div>
      <input
        className="field-input tracking-[0.25em] text-center text-base"
        value={grid}
        onChange={(e) => commitGrid(e.target.value)}
        placeholder="0000 0000"
        spellCheck={false}
      />
      <div className="grid grid-cols-2 gap-1">
        <div>
          <label className="field-label !text-[9px]">X (m)</label>
          <input
            className="field-input text-sm"
            inputMode="numeric"
            value={xStr}
            onChange={(e) => commitXY(e.target.value, yStr)}
          />
        </div>
        <div>
          <label className="field-label !text-[9px]">Y (m)</label>
          <input
            className="field-input text-sm"
            inputMode="numeric"
            value={yStr}
            onChange={(e) => commitXY(xStr, e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
