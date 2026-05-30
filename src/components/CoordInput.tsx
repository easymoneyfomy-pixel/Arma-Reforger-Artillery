import { useTranslation } from "react-i18next";
import { parseGridPair } from "../lib/coords";
import { InfoHint } from "./Tooltip";

type Props = {
  label: string;
  xValue: string;
  yValue: string;
  zValue: string;
  worldSizeM: number;
  onChange: (next: { x: string; y: string; z: string }) => void;
  accent?: "gun" | "target" | "impact";
};

const dot = {
  gun: "bg-emerald-400",
  target: "bg-red-400",
  impact: "bg-amber-400",
};

export default function CoordInput({
  label,
  xValue,
  yValue,
  zValue,
  worldSizeM,
  onChange,
  accent = "gun",
}: Props) {
  const { t } = useTranslation();
  function handleCombined(v: string) {
    const p = parseGridPair(v, worldSizeM);
    if (p) onChange({ x: String(Math.round(p.x)), y: String(Math.round(p.y)), z: zValue });
  }

  function clear() {
    onChange({ x: "", y: "", z: "0" });
  }

  const isGun = accent === "gun";
  const isTarget = accent === "target";

  return (
    <div className={`panel p-3 space-y-3 relative border-l-2 ${isGun ? "border-l-emerald-500/40" : isTarget ? "border-l-red-500/40" : "border-l-amber-500/40"}`}>
      <div className="flex items-center justify-between border-b border-line/40 pb-1.5">
        <span className="section-title flex items-center gap-1.5">
          <span className="text-zinc-600">POS:</span>
          {label.toUpperCase()}
        </span>
        <div className="flex items-center gap-2">
           <div className={`w-1.5 h-1.5 rounded-full ${dot[accent]} shadow-[0_0_8px_currentColor]`}></div>
           <button
            type="button"
            className="text-[10px] font-mono text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-wider"
            onClick={clear}
            title="Clear this position"
          >
            {t('leftPanel.clear')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-0.5">
        <div className="space-y-1">
          <div className="label !text-[9px] flex items-center" title="Easting (X) in meters">
            {t('leftPanel.easting')}
          </div>
          <input
            className="field !py-1.5 text-xs font-mono"
            inputMode="numeric"
            title={`Easting in meters (0–${worldSizeM}).`}
            value={xValue}
            onChange={(e) => onChange({ x: e.target.value, y: yValue, z: zValue })}
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <div className="label !text-[9px] flex items-center" title="Northing (Y) in meters">
            {t('leftPanel.northing')}
          </div>
          <input
            className="field !py-1.5 text-xs font-mono"
            inputMode="numeric"
            title={`Northing in meters (0–${worldSizeM}).`}
            value={yValue}
            onChange={(e) => onChange({ x: xValue, y: e.target.value, z: zValue })}
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <div className="label !text-[9px] flex items-center" title="Altitude / elevation in meters above sea level">
            {t('leftPanel.altitude')}
          </div>
          <input
            className="field !py-1.5 text-xs font-mono"
            inputMode="numeric"
            title="Altitude above sea level, in meters. Optional."
            value={zValue}
            onChange={(e) => onChange({ x: xValue, y: yValue, z: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>

      <div className="pt-0.5 space-y-1.5">
        <div className="label !text-[9px] flex items-center justify-between uppercase">
          <span className="flex items-center gap-1">
            {t('leftPanel.gridString')}
            <InfoHint
              side="top"
              width={280}
              text={
                <>
                  Paste a grid string and press <b>Enter</b>. Examples:
                  <br />· <span className="text-accent">016073</span> → X=01600, Y=07300
                  <br />· <span className="text-accent">0163 0734</span> → X=01630, Y=07340
                </>
              }
            />
          </span>
          <span className="text-[8px] text-zinc-600 font-mono tracking-wider">AUTO-CONVERT</span>
        </div>
        <input
          className="field !py-1.5 text-xs font-mono tracking-widest placeholder:tracking-normal"
          placeholder="000000"
          title="Paste a grid string (e.g. 016073) and press Enter — auto-fills X/Y."
          onBlur={(e) => {
            if (e.target.value) {
              handleCombined(e.target.value);
              e.target.value = "";
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = (e.target as HTMLInputElement).value;
              if (v) {
                handleCombined(v);
                (e.target as HTMLInputElement).value = "";
              }
            }
          }}
        />
      </div>
    </div>
  );
}
