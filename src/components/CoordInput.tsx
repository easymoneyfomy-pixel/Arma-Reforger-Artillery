import { parseGridPair } from "../lib/coords";

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
  function handleCombined(v: string) {
    const p = parseGridPair(v, worldSizeM);
    if (p) onChange({ x: String(Math.round(p.x)), y: String(Math.round(p.y)), z: zValue });
  }
  return (
    <div className="panel-alt p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dot[accent]}`} />
        <span className="section-title">{label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="label mb-1">X (East)</div>
          <input
            className="field"
            inputMode="numeric"
            value={xValue}
            onChange={(e) => onChange({ x: e.target.value, y: yValue, z: zValue })}
            placeholder="0000"
          />
        </div>
        <div>
          <div className="label mb-1">Y (North)</div>
          <input
            className="field"
            inputMode="numeric"
            value={yValue}
            onChange={(e) => onChange({ x: xValue, y: e.target.value, z: zValue })}
            placeholder="0000"
          />
        </div>
        <div>
          <div className="label mb-1">Z (Alt m)</div>
          <input
            className="field"
            inputMode="numeric"
            value={zValue}
            onChange={(e) => onChange({ x: xValue, y: yValue, z: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>
      <div>
        <div className="label mb-1">Grid (e.g. 016073)</div>
        <input
          className="field"
          placeholder="paste full grid"
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
