import { useState } from "react";
import type { FiringSolution, Vec3 } from "../types";
import { bearingRad } from "../lib/coords";
import { InfoHint } from "./Tooltip";

type Props = {
  gun: Vec3 | null;
  target: Vec3 | null;
  solution: FiringSolution | null;
  onApplyAimOffset: (offset: { dxM: number; dyM: number }) => void;
};

// Very rough wind model for high-arc indirect fire:
//   crossWindShift ≈ TOF · v_cross · 0.9     (m, full coupling minus a bit)
//   rangeWindShift ≈ TOF · v_along · 0.5     (m, head/tail wind, half coupling)
// Result is reported as where the round will DRIFT, so the aim should be
// nudged in the opposite direction.
export default function WindPanel({ gun, target, solution, onApplyAimOffset }: Props) {
  const [dirDeg, setDirDeg] = useState(""); // wind FROM direction, 0=N
  const [speed, setSpeed] = useState("");

  const dir = Number(dirDeg);
  const spd = Number(speed);
  const valid = solution && gun && target && Number.isFinite(dir) && Number.isFinite(spd) && spd > 0;

  let alongShift = 0;
  let crossShift = 0;
  let aimDx = 0;
  let aimDy = 0;
  if (valid) {
    // wind FROM direction → wind BLOWS toward (dir + 180)
    const toRad = ((dir + 180) % 360) * (Math.PI / 180);
    const wx = Math.sin(toRad) * spd; // east component
    const wy = Math.cos(toRad) * spd; // north component
    // gun→target unit vector
    const tRad = bearingRad(gun, target);
    const ux = Math.sin(tRad);
    const uy = Math.cos(tRad);
    // perpendicular (right-hand)
    const rx = uy;
    const ry = -ux;
    const along = wx * ux + wy * uy;
    const cross = wx * rx + wy * ry;
    alongShift = solution.tofSec * along * 0.5;
    crossShift = solution.tofSec * cross * 0.9;
    // aim offset = opposite direction of drift, in world frame
    aimDx = -(alongShift * ux + crossShift * rx);
    aimDy = -(alongShift * uy + crossShift * ry);
  }

  function apply() {
    if (!valid) return;
    onApplyAimOffset({ dxM: aimDx, dyM: aimDy });
  }

  function clear() {
    setDirDeg("");
    setSpeed("");
  }

  return (
    <div className="panel p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="section-title flex items-center">
          Wind Correction
          <InfoHint
            width={320}
            text={
              <>
                Estimate where the round will drift given wind. Direction is the
                <b> wind-from</b> bearing (meteorological convention, 0° = wind from
                North). The math is a coarse model: long ToF + high arc → large
                cross-wind drift. Apply nudges the target by the opposite of the
                expected drift so the round lands where you wanted.
              </>
            }
          />
        </span>
        <button
          className="btn !py-0.5 !px-2 !text-[10px]"
          onClick={clear}
          disabled={!dirDeg && !speed}
          title="Clear wind inputs."
        >
          Clear
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="label mb-1">From dir (°)</div>
          <input
            className="field"
            value={dirDeg}
            onChange={(e) => setDirDeg(e.target.value)}
            placeholder="0–360"
            inputMode="numeric"
            title="Wind-from direction in degrees (0 = N, 90 = E, 180 = S, 270 = W)."
          />
        </div>
        <div>
          <div className="label mb-1">Speed (m/s)</div>
          <input
            className="field"
            value={speed}
            onChange={(e) => setSpeed(e.target.value)}
            placeholder="m/s"
            inputMode="numeric"
            title="Wind speed in m/s. 1 m/s ≈ 3.6 km/h ≈ 1.94 kn."
          />
        </div>
      </div>
      {valid ? (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div
            className="panel-alt p-2"
            title="Expected drift along the line of fire. Positive = round lands past the target."
          >
            <div className="label">Range drift</div>
            <div className="font-mono text-base text-accent">
              {alongShift >= 0 ? "+" : "−"}
              {Math.abs(alongShift).toFixed(0)} m
            </div>
          </div>
          <div
            className="panel-alt p-2"
            title="Expected drift perpendicular to the line of fire. Positive = drifts right."
          >
            <div className="label">Lateral drift</div>
            <div className="font-mono text-base text-accent">
              {crossShift >= 0 ? "+" : "−"}
              {Math.abs(crossShift).toFixed(0)} m
            </div>
          </div>
        </div>
      ) : (
        <div className="font-mono text-xs text-zinc-600 py-2">
          Enter wind direction &amp; speed to estimate drift.
        </div>
      )}
      <button
        className="btn-primary w-full"
        onClick={apply}
        disabled={!valid}
        title="Shift target by the opposite of expected drift, so the round lands on the original aim point."
      >
        Apply Aim Offset
      </button>
    </div>
  );
}
