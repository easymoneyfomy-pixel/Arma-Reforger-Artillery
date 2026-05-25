import { useState } from "react";
import type { ChargeTable } from "../types";
import { InfoHint } from "./Tooltip";

type Props = {
  charge: ChargeTable | undefined;
  currentRangeM: number | null;
};

export default function BallisticTable({ charge, currentRangeM }: Props) {
  const [open, setOpen] = useState(false);
  if (!charge) return null;

  return (
    <div className="panel">
      <button
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-black/20"
        onClick={() => setOpen((v) => !v)}
        title="Show the ballistics table used for interpolation."
      >
        <span className="section-title flex items-center">
          {charge.label} · Table
          <InfoHint
            width={260}
            text={
              <>
                Raw range / elevation / TOF rows for the active charge. The solution
                is linearly interpolated between adjacent rows. Highlighted row is the
                one closest to the current target range.
              </>
            }
          />
        </span>
        <span className="font-mono text-[10px] text-zinc-500">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-3 pb-2 max-h-48 overflow-y-auto">
          <table className="w-full font-mono text-[11px]">
            <thead className="text-zinc-500">
              <tr className="border-b border-line">
                <th className="text-left py-1 font-normal">Range&nbsp;m</th>
                <th className="text-right py-1 font-normal">Elev&nbsp;mil</th>
                <th className="text-right py-1 font-normal">ToF&nbsp;s</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let nearestIdx = -1;
                if (currentRangeM !== null) {
                  let bestDiff = Infinity;
                  charge.rows.forEach((r, i) => {
                    const d = Math.abs(r.range_m - currentRangeM);
                    if (d < bestDiff) {
                      bestDiff = d;
                      nearestIdx = i;
                    }
                  });
                }
                return charge.rows.map((r, i) => (
                  <tr
                    key={i}
                    className={
                      i === nearestIdx
                        ? "bg-accentDim/15 text-accent"
                        : "text-zinc-300 hover:bg-black/30"
                    }
                  >
                    <td className="py-0.5">{r.range_m}</td>
                    <td className="text-right py-0.5">{r.elevation_mil}</td>
                    <td className="text-right py-0.5">{r.tof_sec.toFixed(1)}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
