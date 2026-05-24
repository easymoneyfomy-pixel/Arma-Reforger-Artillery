import type { Mission } from "../types";
import { InfoHint } from "./Tooltip";

type Props = {
  missions: Mission[];
  onLoad: (m: Mission) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
};

export default function HistoryPanel({ missions, onLoad, onDelete, onClear }: Props) {
  return (
    <div className="panel p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="section-title flex items-center">
          Combat Memory
          <InfoHint
            width={260}
            text={
              <>
                Saved fire missions stored locally in your browser. Click <b>Load</b>{" "}
                to restore weapon, ammo, charge and coordinates from a past mission.
              </>
            }
          />
        </span>
        <button
          className="btn"
          onClick={onClear}
          disabled={!missions.length}
          title="Delete all saved fire missions."
        >
          Clear
        </button>
      </div>
      <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
        {missions.length === 0 && (
          <div className="font-mono text-xs text-zinc-600 py-3 text-center">
            No missions saved.
          </div>
        )}
        {missions.map((m) => (
          <div
            key={m.id}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border border-line bg-black/30 px-2 py-1.5 hover:border-accentDim"
            title={`${m.label} · saved ${new Date(m.ts).toLocaleString()}`}
          >
            <div className="font-mono text-[11px] leading-tight">
              <div className="text-zinc-200">
                {new Date(m.ts).toLocaleTimeString([], { hour12: false })} ·{" "}
                <span className="text-accent">{m.solution.rangeM.toFixed(0)}m</span> ·{" "}
                {m.solution.bearingMil.toFixed(0)}mil
              </div>
              <div className="text-zinc-500">
                {m.weaponId} / {m.solution.chargeLabel} · T:{" "}
                {m.target.x.toFixed(0)},{m.target.y.toFixed(0)}
              </div>
            </div>
            <button
              className="btn"
              onClick={() => onLoad(m)}
              title="Restore weapon, ammo, charge and coordinates from this mission."
            >
              Load
            </button>
            <button
              className="btn"
              onClick={() => onDelete(m.id)}
              title="Delete this saved mission."
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
