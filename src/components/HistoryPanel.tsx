import { useRef } from "react";
import type { Mission } from "../types";
import { InfoHint } from "./Tooltip";

type Props = {
  missions: Mission[];
  onLoad: (m: Mission) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onImport: (next: Mission[]) => void;
};

export default function HistoryPanel({ missions, onLoad, onDelete, onClear, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  function exportJson() {
    const blob = new Blob([JSON.stringify(missions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fdc_missions_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error("not an array");
        const cleaned = data.filter(
          (m) => m && typeof m === "object" && m.id && m.gun && m.target && m.solution,
        ) as Mission[];
        if (!cleaned.length) {
          alert("No valid missions found in file.");
          return;
        }
        onImport(cleaned);
      } catch (err) {
        alert("Invalid mission JSON.");
      }
    };
    reader.readAsText(f);
  }

  return (
    <div className="panel p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="section-title flex items-center">
          <span className="text-zinc-600 mr-1">MEM:</span>Combat Memory
          <InfoHint
            width={280}
            text={
              <>
                Saved fire missions stored locally in your browser. <b>Load</b>{" "}
                restores weapon, ammo, charge and coordinates. <b>Export</b> downloads
                them as JSON so you can back up or share between machines.
              </>
            }
          />
        </span>
        <div className="flex items-center gap-1">
          <button
            className="btn !py-1 !px-2 !text-[10px]"
            onClick={exportJson}
            disabled={!missions.length}
            title="Download all saved missions as a JSON file."
          >
            Export
          </button>
          <button
            className="btn !py-1 !px-2 !text-[10px]"
            onClick={() => fileRef.current?.click()}
            title="Import missions from a previously-exported JSON file (appends to existing)."
          >
            Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={importJson}
          />
          <button
            className="btn !py-1 !px-2 !text-[10px]"
            onClick={onClear}
            disabled={!missions.length}
            title="Delete all saved fire missions."
          >
            Clear
          </button>
        </div>
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
            className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border border-line bg-black/30 px-2 py-1.5 hover:border-accentDim transition-colors"
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
              className="btn !py-0.5 !px-2 !text-[10px]"
              onClick={() => onLoad(m)}
              title="Restore weapon, ammo, charge and coordinates from this mission."
            >
              Load
            </button>
            <button
              className="btn !py-0.5 !px-1.5 !text-[10px] hover:border-danger hover:text-danger hover:shadow-[0_0_8px_rgba(224,70,70,0.15)]"
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
