import { useState } from "react";
import type { FiringSolution } from "../types";
import { InfoHint, Tooltip } from "./Tooltip";

type Props = {
  solution: FiringSolution | null;
  onSave: () => void;
};

function formatSolutionText(s: FiringSolution): string {
  return [
    "FIRE MISSION",
    `WPN  ${s.weaponId.toUpperCase()}  AMMO ${s.ammoId.toUpperCase()}  ${s.chargeLabel.toUpperCase()}`,
    `AZ   ${s.bearingMil.toFixed(0)} mil  (${s.bearingDeg.toFixed(1)} deg)`,
    `ELEV ${s.elevationMil.toFixed(0)} mil`,
    `RNG  ${s.rangeM.toFixed(0)} m`,
    `TOF  ${s.tofSec.toFixed(1)} s`,
    `ARC  ${s.arc.toUpperCase()}   ALT ${s.altDeltaM >= 0 ? "+" : "-"}${Math.abs(s.altDeltaM).toFixed(0)} m`,
  ].join("\n");
}

function Stat({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: React.ReactNode;
}) {
  return (
    <div className="panel-alt p-3 flex flex-col gap-1" title={typeof hint === "string" ? hint : undefined}>
      <span className="label flex items-center">
        {label}
        {hint && <InfoHint side="top" text={hint} />}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-3xl text-accent tabular-nums">{value}</span>
        {unit && <span className="font-mono text-xs text-zinc-500">{unit}</span>}
      </div>
    </div>
  );
}

export default function RightPanel({ solution, onSave }: Props) {
  const [copied, setCopied] = useState(false);

  async function copySolution() {
    if (!solution) return;
    try {
      await navigator.clipboard.writeText(formatSolutionText(solution));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked — silently ignore */
    }
  }

  return (
    <div className="space-y-3">
      <div className="panel p-3">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2">
            <span className="section-title flex items-center">
              <span className="text-zinc-600 mr-1">FDC:</span>Firing Solution
              <InfoHint
                width={280}
                text={
                  <>
                    Computed firing data from the selected ballistic table.
                    Set <b>Azimuth</b> (compass) and <b>Elevation</b> (mils) on the gun.
                    Time of Flight is the projectile travel time after firing.
                  </>
                }
              />
            </span>
            {solution ? (
              <div className="flex items-center gap-1.5 px-1.5 py-0.5 border border-accentDim bg-accentDim/10 text-[8px] text-accent animate-pulse font-mono tracking-widest rounded-sm">
                ONLINE
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-1.5 py-0.5 border border-line bg-panelAlt/50 text-[8px] text-zinc-500 font-mono tracking-widest rounded-sm">
                STANDBY
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Tooltip
              side="left"
              content="Copy the firing solution as plain text (radio-comms format) to your clipboard."
            >
              <button
                className="btn !py-1 !px-2 !text-[10px]"
                onClick={copySolution}
                disabled={!solution}
                title="Copy solution as text"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </Tooltip>
            <Tooltip
              side="left"
              content="Save this fire mission to local history. Use the Combat Memory panel to reload it later."
            >
              <button className="btn-primary" onClick={onSave} disabled={!solution}>
                Save Mission
              </button>
            </Tooltip>
          </div>
        </div>

        {!solution ? (
          <div className="font-mono text-xs text-zinc-500 py-6 text-center">
            Enter gun and target coordinates to compute solution.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Stat
              label="Range"
              value={solution.rangeM.toFixed(0)}
              unit="m"
              hint="Ground (2D) distance from gun to target."
            />
            <Stat
              label="Time of Flight"
              value={solution.tofSec.toFixed(1)}
              unit="s"
              hint="Seconds from firing to impact."
            />
            <Stat
              label="Azimuth"
              value={solution.bearingMil.toFixed(0)}
              unit="mil"
              hint="Direction to target in NATO mils (6400 / circle), measured clockwise from North."
            />
            <Stat
              label="Azimuth"
              value={solution.bearingDeg.toFixed(1)}
              unit="°"
              hint="Direction to target in degrees, clockwise from North."
            />
            <Stat
              label="Elevation"
              value={solution.elevationMil.toFixed(0)}
              unit="mil"
              hint="Tube elevation in mils. Match this on the gun's elevation indicator."
            />
            <Stat
              label="Charge"
              value={solution.chargeLabel.replace("Charge ", "C")}
              hint="Powder charge to load. C0 = bag only; higher numbers add increments."
            />
          </div>
        )}
        {solution && (
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px] text-zinc-400">
            <div
              className="border border-line bg-black/30 px-2 py-1 flex items-center justify-between"
              title="High arc (≥800 mil ≈ 45°) is mortar-style indirect fire; low arc is flatter and faster."
            >
              <span className="label !text-[9px]">Arc</span>
              <span
                className={
                  solution.arc === "high"
                    ? "text-accent"
                    : solution.arc === "low"
                      ? "text-amber-400"
                      : "text-danger"
                }
              >
                {solution.arc.toUpperCase()}
              </span>
            </div>
            <div
              className="border border-line bg-black/30 px-2 py-1 flex items-center justify-between"
              title="Target altitude minus gun altitude. Tables assume level terrain — large deltas reduce accuracy."
            >
              <span className="label !text-[9px]">Δ Alt</span>
              <span className={Math.abs(solution.altDeltaM) >= 25 ? "text-danger" : "text-zinc-300"}>
                {solution.altDeltaM >= 0 ? "+" : "−"}
                {Math.abs(solution.altDeltaM).toFixed(0)} m
              </span>
            </div>
          </div>
        )}
      </div>

      {solution && solution.warnings.length > 0 && (
        <div className="panel border-danger/40 p-3 space-y-1 shadow-[0_0_12px_rgba(224,70,70,0.06)]">
          <div className="section-title text-danger flex items-center">
            // WARNINGS
            <InfoHint
              width={260}
              text={
                <>
                  Issues that may make the solution inaccurate or unreachable.
                  Try another charge or check the gun/target elevations.
                </>
              }
            />
          </div>
          {solution.warnings.map((w, i) => (
            <div key={i} className="font-mono text-xs text-danger/90">
              · {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
