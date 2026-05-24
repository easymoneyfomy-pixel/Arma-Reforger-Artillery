import { useState } from "react";
import type { FiringSolution, Vec3 } from "../types";
import { correctedTarget, correctionDelta } from "../lib/ballistics";

type Props = {
  gun: Vec3 | null;
  target: Vec3 | null;
  solution: FiringSolution | null;
  onApplyCorrection: (corrected: Vec3) => void;
};

export default function CorrectionPanel({ gun, target, solution, onApplyCorrection }: Props) {
  const [ix, setIx] = useState("");
  const [iy, setIy] = useState("");
  const [iz, setIz] = useState("");

  const impact: Vec3 | null =
    ix && iy ? { x: Number(ix), y: Number(iy), z: Number(iz || 0) } : null;

  const delta =
    gun && target && impact ? correctionDelta(gun, target, impact) : null;

  function apply() {
    if (!target || !impact) return;
    onApplyCorrection(correctedTarget(target, impact));
  }

  return (
    <div className="panel p-3 space-y-2">
      <span className="section-title">Impact Correction</span>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="label mb-1">Impact X</div>
          <input className="field" value={ix} onChange={(e) => setIx(e.target.value)} placeholder="meters" />
        </div>
        <div>
          <div className="label mb-1">Impact Y</div>
          <input className="field" value={iy} onChange={(e) => setIy(e.target.value)} placeholder="meters" />
        </div>
        <div>
          <div className="label mb-1">Impact Z</div>
          <input className="field" value={iz} onChange={(e) => setIz(e.target.value)} placeholder="0" />
        </div>
      </div>

      {delta ? (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="panel-alt p-2">
            <div className="label">Range delta</div>
            <div className="font-mono text-lg text-accent">
              {delta.alongM >= 0 ? "+" : "−"}
              {Math.abs(delta.alongM).toFixed(0)} m
            </div>
            <div className="font-mono text-[10px] text-zinc-500">
              {delta.alongM >= 0 ? "OVER target → drop" : "SHORT of target → add"}
            </div>
          </div>
          <div className="panel-alt p-2">
            <div className="label">Lateral delta</div>
            <div className="font-mono text-lg text-accent">
              {delta.crossM >= 0 ? "+" : "−"}
              {Math.abs(delta.crossM).toFixed(0)} m
            </div>
            <div className="font-mono text-[10px] text-zinc-500">
              {delta.crossM >= 0 ? "RIGHT of target → shift left" : "LEFT of target → shift right"}
            </div>
          </div>
        </div>
      ) : (
        <div className="font-mono text-xs text-zinc-600 py-2">
          Enter observed impact point to compute correction.
        </div>
      )}

      <button
        className="btn-primary w-full"
        onClick={apply}
        disabled={!delta || !solution}
      >
        Apply Correction (mirror to target)
      </button>
    </div>
  );
}
