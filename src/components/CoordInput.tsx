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
  function handleCombined(v: string) {
    const p = parseGridPair(v, worldSizeM);
    if (p) onChange({ x: String(Math.round(p.x)), y: String(Math.round(p.y)), z: zValue });
  }

  function clear() {
    onChange({ x: "", y: "", z: "0" });
  }

  return (
    <div className="panel-alt p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dot[accent]} shadow-[0_0_6px_currentColor]`} />
        <span className="section-title">// {label}</span>
        <InfoHint
          side="bottom"
          text={
            <>
              Position in <b>world meters</b>. Read these off the in-game map: open
              the map, hover a position — the game shows X/Y. You can also click the
              tactical map on the right to set this automatically.
            </>
          }
        />
        <button
          type="button"
          className="btn !py-0.5 !px-2 !text-[10px] ml-auto"
          onClick={clear}
          title="Clear this position"
        >
          Clear
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="label mb-1 flex items-center" title="Easting (X) in meters">
            [X] Easting
            <InfoHint
              side="bottom"
              text={`Easting in meters from the western map edge. Max ${worldSizeM} m on this map.`}
            />
          </div>
          <input
            className="field"
            inputMode="numeric"
            title={`Easting in meters (0–${worldSizeM}).`}
            value={xValue}
            onChange={(e) => onChange({ x: e.target.value, y: yValue, z: zValue })}
            placeholder="meters"
          />
        </div>
        <div>
          <div className="label mb-1 flex items-center" title="Northing (Y) in meters">
            [Y] Northing
            <InfoHint
              side="bottom"
              text={`Northing in meters from the southern map edge. Max ${worldSizeM} m on this map.`}
            />
          </div>
          <input
            className="field"
            inputMode="numeric"
            title={`Northing in meters (0–${worldSizeM}).`}
            value={yValue}
            onChange={(e) => onChange({ x: xValue, y: e.target.value, z: zValue })}
            placeholder="meters"
          />
        </div>
        <div>
          <div className="label mb-1 flex items-center" title="Altitude / elevation in meters above sea level">
            [Z] Altitude
            <InfoHint
              side="bottom"
              text={
                <>
                  Altitude (ASL) in meters. Optional — only matters when gun and target
                  are at very different elevations. A warning appears if Δz ≥ 25 m.
                </>
              }
            />
          </div>
          <input
            className="field"
            inputMode="numeric"
            title="Altitude above sea level, in meters. Optional."
            value={zValue}
            onChange={(e) => onChange({ x: xValue, y: yValue, z: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>
      <div>
        <div className="label mb-1 flex items-center">
          [G] Grid String (e.g. 016073)
          <InfoHint
            side="bottom"
            width={280}
            text={
              <>
                Paste a grid string and press <b>Enter</b>. Examples:
                <br />· <span className="text-accent">016073</span> → X=01600, Y=07300
                <br />· <span className="text-accent">0163 0734</span> → X=01630, Y=07340
                <br />· comma / slash separators also work
              </>
            }
          />
        </div>
        <input
          className="field"
          placeholder="paste grid, press Enter"
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
