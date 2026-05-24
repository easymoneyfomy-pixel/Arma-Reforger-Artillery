import type { FiringSolution } from "../types";
import { InfoHint, Tooltip } from "./Tooltip";

type Props = {
  solution: FiringSolution | null;
  onSave: () => void;
};

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
  return (
    <div className="space-y-3">
      <div className="panel p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="section-title flex items-center">
            Firing Solution
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
          <Tooltip
            side="left"
            content="Save this fire mission to local history. Use the Combat Memory panel to reload it later."
          >
            <button className="btn-primary" onClick={onSave} disabled={!solution}>
              Save Mission
            </button>
          </Tooltip>
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
      </div>

      {solution && solution.warnings.length > 0 && (
        <div className="panel border-danger/40 p-3 space-y-1">
          <div className="section-title text-danger flex items-center">
            Warnings
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
