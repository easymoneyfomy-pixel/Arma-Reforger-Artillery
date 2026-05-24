import type { FiringSolution } from "../types";

type Props = {
  solution: FiringSolution | null;
  onSave: () => void;
};

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="panel-alt p-3 flex flex-col gap-1">
      <span className="label">{label}</span>
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
          <span className="section-title">Firing Solution</span>
          <button className="btn-primary" onClick={onSave} disabled={!solution}>
            Save Mission
          </button>
        </div>

        {!solution ? (
          <div className="font-mono text-xs text-zinc-500 py-6 text-center">
            Enter gun and target coordinates to compute solution.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Range" value={solution.rangeM.toFixed(0)} unit="m" />
            <Stat label="Time of Flight" value={solution.tofSec.toFixed(1)} unit="s" />
            <Stat label="Azimuth" value={solution.bearingMil.toFixed(0)} unit="mil" />
            <Stat label="Azimuth" value={solution.bearingDeg.toFixed(1)} unit="°" />
            <Stat label="Elevation" value={solution.elevationMil.toFixed(0)} unit="mil" />
            <Stat label="Charge" value={solution.chargeLabel.replace("Charge ", "C")} />
          </div>
        )}
      </div>

      {solution && solution.warnings.length > 0 && (
        <div className="panel border-danger/40 p-3 space-y-1">
          <div className="section-title text-danger">Warnings</div>
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
