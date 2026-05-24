import { useEffect, useRef, useState } from "react";
import type { MapDef, Vec3 } from "../types";

type Props = {
  map: MapDef;
  maps: MapDef[];
  setMapId: (id: string) => void;
  onAddMap: (m: MapDef) => void;
  onCalibrate: (cal: MapDef["calibration"]) => void;
  gun: Vec3 | null;
  target: Vec3 | null;
  impact: Vec3 | null;
  setGun: (v: Vec3) => void;
  setTarget: (v: Vec3) => void;
};

type CalibMode = null | "p1" | "p2";

// Translate world (x_east, y_north) -> image pixel (px, py).
// For built-in maps without calibration: linear mapping, image is square,
// origin (0,0) at bottom-left (Y points up in-game; px Y points down).
function worldToPx(map: MapDef, world: { x: number; y: number }, dispW: number, dispH: number) {
  const cal = map.calibration;
  if (cal) {
    const dx = cal.p2.world.x - cal.p1.world.x || 1;
    const dy = cal.p2.world.y - cal.p1.world.y || 1;
    const fx = (world.x - cal.p1.world.x) / dx;
    const fy = (world.y - cal.p1.world.y) / dy;
    const px = cal.p1.px.x + fx * (cal.p2.px.x - cal.p1.px.x);
    const py = cal.p1.px.y + fy * (cal.p2.px.y - cal.p1.px.y);
    return { x: (px / 1000) * dispW, y: (py / 1000) * dispH };
  }
  const fx = world.x / map.worldSizeM;
  const fy = world.y / map.worldSizeM;
  return { x: fx * dispW, y: (1 - fy) * dispH };
}

function pxToWorld(map: MapDef, px: { x: number; y: number }, dispW: number, dispH: number) {
  const cal = map.calibration;
  if (cal) {
    // Normalize displayed px back to 0..1000 logical space
    const lpx = (px.x / dispW) * 1000;
    const lpy = (px.y / dispH) * 1000;
    const dxp = cal.p2.px.x - cal.p1.px.x || 1;
    const dyp = cal.p2.px.y - cal.p1.px.y || 1;
    const fx = (lpx - cal.p1.px.x) / dxp;
    const fy = (lpy - cal.p1.px.y) / dyp;
    return {
      x: cal.p1.world.x + fx * (cal.p2.world.x - cal.p1.world.x),
      y: cal.p1.world.y + fy * (cal.p2.world.y - cal.p1.world.y),
    };
  }
  const fx = px.x / dispW;
  const fy = px.y / dispH;
  return { x: fx * map.worldSizeM, y: (1 - fy) * map.worldSizeM };
}

export default function MapView({
  map,
  maps,
  setMapId,
  onAddMap,
  onCalibrate,
  gun,
  target,
  impact,
  setGun,
  setTarget,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 600 });
  const [placeMode, setPlaceMode] = useState<"gun" | "target">("gun");
  const [calibMode, setCalibMode] = useState<CalibMode>(null);
  const [calibDraft, setCalibDraft] = useState<MapDef["calibration"] | null>(null);
  const [calibWorldInput, setCalibWorldInput] = useState({ x: "0", y: "0" });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const obs = new ResizeObserver(() => {
      const el = containerRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const s = Math.min(r.width, r.height);
        setSize({ w: s, h: s });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - target.left;
    const py = e.clientY - target.top;
    const world = pxToWorld(map, { x: px, y: py }, size.w, size.h);
    if (calibMode) {
      const wx = Number(calibWorldInput.x) || 0;
      const wy = Number(calibWorldInput.y) || 0;
      // Normalize displayed px to 0..1000 logical so calibration is image-size independent
      const lpx = { x: (px / size.w) * 1000, y: (py / size.h) * 1000 };
      const cur = calibDraft ?? {
        p1: { px: { x: 0, y: 1000 }, world: { x: 0, y: 0 } },
        p2: { px: { x: 1000, y: 0 }, world: { x: map.worldSizeM, y: map.worldSizeM } },
      };
      const next = { ...cur, [calibMode]: { px: lpx, world: { x: wx, y: wy } } } as MapDef["calibration"];
      setCalibDraft(next);
      setCalibMode(null);
      return;
    }
    const v = { x: world.x, y: world.y, z: 0 };
    if (placeMode === "gun") setGun(v);
    else setTarget(v);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const id = "custom_" + Date.now().toString(36);
      onAddMap({
        id,
        name: f.name.replace(/\.[^.]+$/, "") + " (custom)",
        worldSizeM: 8192,
        image: dataUrl,
        builtin: false,
      });
      setMapId(id);
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  }

  const markers: Array<{ pos: { x: number; y: number }; color: string; label: string }> = [];
  if (gun) markers.push({ pos: worldToPx(map, gun, size.w, size.h), color: "#34d399", label: "G" });
  if (target) markers.push({ pos: worldToPx(map, target, size.w, size.h), color: "#f87171", label: "T" });
  if (impact) markers.push({ pos: worldToPx(map, impact, size.w, size.h), color: "#fbbf24", label: "I" });

  const showLine = gun && target;

  return (
    <div className="panel p-3 space-y-2 flex flex-col h-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="section-title">Tactical Map</span>
        <div className="flex items-center gap-1">
          <select
            className="field !py-1 !text-xs"
            value={map.id}
            onChange={(e) => setMapId(e.target.value)}
          >
            {maps.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {(m.worldSizeM / 1000).toFixed(1)}km
              </option>
            ))}
          </select>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Upload
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <button
          className={placeMode === "gun" ? "btn-primary" : "btn"}
          onClick={() => setPlaceMode("gun")}
        >
          Place Gun
        </button>
        <button
          className={placeMode === "target" ? "btn-primary" : "btn"}
          onClick={() => setPlaceMode("target")}
        >
          Place Target
        </button>
        {!map.builtin && (
          <details className="ml-auto">
            <summary className="btn cursor-pointer list-none">Calibrate</summary>
            <div className="absolute right-0 z-10 mt-1 panel p-3 w-72 space-y-2">
              <div className="text-[10px] font-mono text-zinc-400">
                1) Type the world coordinate of a known map point.<br />
                2) Click <b>Mark P1/P2</b> then click that pixel on the map.<br />
                3) Repeat for second point, then <b>Save</b>.
              </div>
              <div className="grid grid-cols-2 gap-1">
                <input
                  className="field"
                  placeholder="world X"
                  value={calibWorldInput.x}
                  onChange={(e) => setCalibWorldInput({ ...calibWorldInput, x: e.target.value })}
                />
                <input
                  className="field"
                  placeholder="world Y"
                  value={calibWorldInput.y}
                  onChange={(e) => setCalibWorldInput({ ...calibWorldInput, y: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  className={calibMode === "p1" ? "btn-primary" : "btn"}
                  onClick={() => setCalibMode("p1")}
                >
                  Mark P1
                </button>
                <button
                  className={calibMode === "p2" ? "btn-primary" : "btn"}
                  onClick={() => setCalibMode("p2")}
                >
                  Mark P2
                </button>
              </div>
              {calibDraft && (
                <div className="font-mono text-[10px] text-zinc-400 leading-snug">
                  P1: ({calibDraft.p1.world.x.toFixed(0)}, {calibDraft.p1.world.y.toFixed(0)}) px(
                  {calibDraft.p1.px.x.toFixed(0)},{calibDraft.p1.px.y.toFixed(0)})
                  <br />
                  P2: ({calibDraft.p2.world.x.toFixed(0)}, {calibDraft.p2.world.y.toFixed(0)}) px(
                  {calibDraft.p2.px.x.toFixed(0)},{calibDraft.p2.px.y.toFixed(0)})
                </div>
              )}
              <button
                className="btn-primary w-full"
                disabled={!calibDraft}
                onClick={() => {
                  if (calibDraft) onCalibrate(calibDraft);
                }}
              >
                Save Calibration
              </button>
            </div>
          </details>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 min-h-[300px] border border-line bg-black/60 overflow-hidden select-none"
        onClick={handleClick}
        style={{ cursor: calibMode ? "crosshair" : "pointer" }}
      >
        <div
          className="absolute"
          style={{ width: size.w, height: size.h, left: 0, top: 0 }}
        >
          {map.image ? (
            <img
              src={map.image}
              alt={map.name}
              className="block w-full h-full object-cover opacity-90"
              draggable={false}
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(214,255,58,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(214,255,58,.06) 1px, transparent 1px)",
                backgroundSize: `${size.w / 10}px ${size.h / 10}px`,
              }}
            />
          )}
          {/* coord overlay grid */}
          <svg className="absolute inset-0" width={size.w} height={size.h}>
            {[...Array(11)].map((_, i) => (
              <g key={i}>
                <line
                  x1={(i * size.w) / 10}
                  y1={0}
                  x2={(i * size.w) / 10}
                  y2={size.h}
                  stroke="rgba(214,255,58,0.06)"
                />
                <line
                  x1={0}
                  y1={(i * size.h) / 10}
                  x2={size.w}
                  y2={(i * size.h) / 10}
                  stroke="rgba(214,255,58,0.06)"
                />
              </g>
            ))}
            {showLine && gun && target && (() => {
              const a = worldToPx(map, gun, size.w, size.h);
              const b = worldToPx(map, target, size.w, size.h);
              return (
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#d6ff3a"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                />
              );
            })()}
            {markers.map((m, i) => (
              <g key={i} transform={`translate(${m.pos.x},${m.pos.y})`}>
                <circle r={6} fill={m.color} stroke="#000" strokeWidth={1} />
                <text
                  x={10}
                  y={4}
                  fontSize={11}
                  fontFamily="ui-monospace, monospace"
                  fill={m.color}
                >
                  {m.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
      <div className="font-mono text-[10px] text-zinc-500">
        Click map to place {placeMode === "gun" ? "GUN" : "TARGET"} (world size {map.worldSizeM}m).
      </div>
    </div>
  );
}
