import { useTranslation } from "react-i18next";
import type { Mission } from "../types";

type Props = {
  missions: Mission[];
  onSelect: (m: Mission) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onImport: () => void;
};

export default function HistoryPanel({ missions, onSelect, onDelete, onClear, onImport }: Props) {
  const { t } = useTranslation();
  return (
    <div className="panel p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="section-title flex items-center">
          <span className="text-zinc-600 mr-1">MEM:</span>{t('history.title')}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono"
            onClick={onImport}
            title="Import missions from JSON clipboard."
          >
            {t('history.import').toUpperCase()}
          </button>
          <button
            className="text-[10px] text-zinc-500 hover:text-red-400 font-mono"
            onClick={() => {
              if (confirm("Clear all mission history? This cannot be undone.")) onClear();
            }}
            title="Clear all saved missions."
          >
            {t('history.clear').toUpperCase()}
          </button>
        </div>
      </div>

      <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
        {missions.length === 0 ? (
          <div className="font-mono text-xs text-zinc-600 py-4 text-center border border-dashed border-line/30">
            {t('history.empty')}
          </div>
        ) : (
          missions
            .slice()
            .sort((a, b) => b.ts - a.ts)
            .map((m) => (
              <div
                key={m.id}
                className="group flex flex-col border border-line bg-black/20 hover:border-accentDim/60 p-2 cursor-pointer transition-all"
                onClick={() => onSelect(m)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-accent font-bold tracking-wider">
                    {m.label}
                  </span>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(m.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="font-mono text-[11px] text-zinc-400">
                    AZ {m.solution.bearingMil.toFixed(0)} · EL {m.solution.elevationMil.toFixed(0)}
                  </div>
                  <div className="font-mono text-[9px] text-zinc-600">
                    {m.solution.chargeLabel.replace("Charge ", "C")} · {m.solution.tofSec.toFixed(1)}s
                  </div>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
