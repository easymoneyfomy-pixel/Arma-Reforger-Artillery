import { useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ChargeTable, MapDef, Vec3 } from "../types";
import { Tooltip, InfoHint } from "./Tooltip";
import { useMapProjection } from "../hooks/useMapProjection";

type Props = {
   map: MapDef;
   maps: MapDef[];
   setMapId: (id: string) => void;
   onAddMap: (m: MapDef) => void;
   onDeleteMap: (id: string) => void;
   onCalibrate: (cal: MapDef["calibration"]) => void;
   gun: Vec3 | null;
   target: Vec3 | null;
   impact: Vec3 | null;
   setGun: (v: Vec3) => void;
   setTarget: (v: Vec3) => void;
   placeMode: "gun" | "target";
   setPlaceMode: (m: "gun" | "target") => void;
   charges: ChargeTable[];
   activeChargeId: string;
   showRangeRings: boolean;
   setShowRangeRings: (v: boolean) => void;
   isPremium: boolean;
   onOpenLicense: () => void;
 };

 export default function MapView({
   map,
   maps,
   setMapId,
   onAddMap,
   onDeleteMap,
   onCalibrate,
   gun,
   target,
   impact,
   setGun,
   setTarget,
   placeMode,
   setPlaceMode,
   charges,
   activeChargeId,
   showRangeRings,
   setShowRangeRings,
   isPremium,
   onOpenLicense,
 }: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 600 });
  const { worldToPx, pxToWorld, metersToPx } = useMapProjection(map, size);

  const [calibStep, setCalibStep] = useState<number>(0); // 0: inactive, 1: p1, 2: p2, 3: p3, 4: review
  const [calibDraft, setCalibDraft] = useState<MapDef["calibration"] | null>(null);
  const [calibWorldInput, setCalibWorldInput] = useState({ x: "0", y: "0" });
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [customSize, setCustomSize] = useState("8192");
  const [dragging, setDragging] = useState<null | "gun" | "target" | "p1" | "p2" | "p3">(null);
  const [showCep, setShowCep] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panDrag, setPanDrag] = useState<null | { ox: number; oy: number; sx: number; sy: number }>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const calibXRef = useRef<HTMLInputElement>(null);
  const calibYRef = useRef<HTMLInputElement>(null);

  const magnifierPos = useMemo(() => {
    if (calibStep >= 1 || (dragging && dragging.startsWith("p"))) return cursor;
    return null;
  }, [calibStep, dragging, cursor]);

  function clampPan(p: { x: number; y: number }, s: number, w: number, h: number) {
    const margin = 0.25;
    const minX = -w * s + w * margin;
    const maxX = w - w * margin;
    const minY = -h * s + h * margin;
    const maxY = h - h * margin;
    return {
      x: Math.max(minX, Math.min(maxX, p.x)),
      y: Math.max(minY, Math.min(maxY, p.y)),
    };
  }

  const zoomAt = useMemo(() => (factor: number, anchor: { x: number; y: number }) => {
    const next = Math.max(1, Math.min(12, scale * factor));
    if (next === scale) return;
    const lx = (anchor.x - pan.x) / scale;
    const ly = (anchor.y - pan.y) / scale;
    setScale(next);
    setPan(clampPan({ x: anchor.x - lx * next, y: anchor.y - ly * next }, next, size.w, size.h));
  }, [scale, pan, size]);

  function resetView() {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }

  function eventLocalPx(e: React.MouseEvent | MouseEvent) {
    const el = containerRef.current;
    if (!el) return { cx: 0, cy: 0, x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    return { cx, cy, x: (cx - pan.x) / scale, y: (cy - pan.y) / scale };
  }

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

  useEffect(() => {
    setCalibDraft(null);
  }, [map.id]);

  function startCalibration() {
    setCalibStep(1);
    setCalibDraft(map.calibration ?? {
      p1: { px: { x: 250, y: 750 }, world: { x: 0, y: 0 } },
      p2: { px: { x: 750, y: 250 }, world: { x: map.worldSizeM, y: map.worldSizeM } },
    });
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (dragging || panDrag) return;
    const lp = eventLocalPx(e);
    const world = pxToWorld({ x: lp.x, y: lp.y });
    
    if (calibStep >= 1 && calibStep <= 3) {
      const pointId = `p${calibStep}` as "p1" | "p2" | "p3";
      const lpx = { x: (lp.x / size.w) * 1000, y: (lp.y / size.h) * 1000 };
      const point = { ...(calibDraft![pointId] || { world: { x: 0, y: 0 } }), px: lpx };
      const next = {
        ...calibDraft!,
        [pointId]: point
      };
      setCalibDraft(next);
      setCalibWorldInput({ 
        x: point.world.x.toString(), 
        y: point.world.y.toString() 
      });
      // Auto-focus the X coordinate field
      setTimeout(() => calibXRef.current?.focus(), 10);
      return;
    }
    
    const v = { x: world.x, y: world.y, z: placeMode === "gun" ? gun?.z ?? 0 : target?.z ?? 0 };
    if (placeMode === "gun") setGun(v);
    else setTarget(v);
  }

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const lp = eventLocalPx(e);
    const world = pxToWorld({ x: lp.x, y: lp.y });
    setCursor(world);
    if (panDrag) {
      const np = clampPan(
        { x: panDrag.ox + (lp.cx - panDrag.sx), y: panDrag.oy + (lp.cy - panDrag.sy) },
        scale,
        size.w,
        size.h,
      );
      setPan(np);
      return;
    }
    if (dragging) {
      if (dragging === "gun" || dragging === "target") {
        const v = { x: world.x, y: world.y, z: dragging === "gun" ? gun?.z ?? 0 : target?.z ?? 0 };
        if (dragging === "gun") setGun(v);
        else setTarget(v);
      } else if (calibDraft) {
        const pointId = dragging as "p1" | "p2" | "p3";
        const lpx = { x: (lp.x / size.w) * 1000, y: (lp.y / size.h) * 1000 };
        const next = {
          ...calibDraft,
          [pointId]: { ...calibDraft[pointId]!, px: lpx },
        };
        setCalibDraft(next);
      }
    }
  }

  function handleLeave() {
    setCursor(null);
    setDragging(null);
    setPanDrag(null);
  }

  function startDrag(e: React.MouseEvent, which: "gun" | "target" | "p1" | "p2" | "p3") {
    e.stopPropagation();
    e.preventDefault();
    setDragging(which);
  }

  function stopDrag() {
    setDragging(null);
    setPanDrag(null);
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      const lp = eventLocalPx(e);
      setPanDrag({ ox: pan.x, oy: pan.y, sx: lp.cx, sy: lp.cy });
    }
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.25 : 1 / 1.25;
      zoomAt(factor, { x: cx, y: cy });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setUploadError("File must be an image (PNG / JPG / WebP).");
      e.target.value = "";
      return;
    }
    if (f.size > 12 * 1024 * 1024) {
      setUploadError("Image is larger than 12 MB. Use a smaller export.");
      e.target.value = "";
      return;
    }
    const sizeM = Math.max(256, Math.min(20480, Number(customSize) || 8192));
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const id = "custom_" + Date.now().toString(36);
      onAddMap({
        id,
        name: f.name.replace(/\.[^.]+$/, "") + " (custom)",
        worldSizeM: sizeM,
        image: dataUrl,
        builtin: false,
      });
      setMapId(id);
    };
    reader.onerror = () => setUploadError("Could not read the file. Try a different image.");
    reader.readAsDataURL(f);
    e.target.value = "";
  }

  function swap() {
    if (gun && target) {
      setGun(target);
      setTarget(gun);
    }
  }

  const markers: Array<{ pos: { x: number; y: number }; color: string; label: string; which?: "gun" | "target" | "p1" | "p2" | "p3" }> = [];
  if (gun) markers.push({ pos: worldToPx(gun), color: "#34d399", label: "G", which: "gun" });
  if (target) markers.push({ pos: worldToPx(target), color: "#f87171", label: "T", which: "target" });
  if (impact) markers.push({ pos: worldToPx(impact), color: "#fbbf24", label: "I" });

  // Add calibration markers if drafting
  if (calibDraft) {
    markers.push({
      pos: { x: (calibDraft.p1.px.x / 1000) * size.w, y: (calibDraft.p1.px.y / 1000) * size.h },
      color: "#60a5fa",
      label: "P1",
      which: "p1",
    });
    markers.push({
      pos: { x: (calibDraft.p2.px.x / 1000) * size.w, y: (calibDraft.p2.px.y / 1000) * size.h },
      color: "#60a5fa",
      label: "P2",
      which: "p2",
    });
    if (calibDraft.p3) {
      markers.push({
        pos: { x: (calibDraft.p3.px.x / 1000) * size.w, y: (calibDraft.p3.px.y / 1000) * size.h },
        color: "#60a5fa",
        label: "P3",
        which: "p3",
      });
    }
  }

  const showLine = gun && target;
  const rangeM = gun && target ? Math.hypot(target.x - gun.x, target.y - gun.y) : null;

  const rings: Array<{ r: number; color: string; label: string; dash?: string }> = [];
  if (gun && showRangeRings && charges.length) {
    for (const c of charges) {
      const min = c.rows[0].range_m;
      const max = c.rows[c.rows.length - 1].range_m;
      const isActive = c.id === activeChargeId;
      const color = isActive ? "#d6ff3a" : "rgba(214,255,58,0.25)";
      rings.push({
        r: metersToPx(gun, max),
        color,
        label: `C${c.id} ${max}m`,
        dash: isActive ? undefined : "3 3",
      });
      if (min > 0) {
        rings.push({
          r: metersToPx(gun, min),
          color,
          label: "",
          dash: "1 3",
        });
      }
    }
  }

  // --- Arma Reforger Grid Logic ---
  const gridContent = useMemo(() => {
    const lines = [];
    const labels = [];
    
    // Grid settings
    const majorStep = 1000; // 1km squares
    const minorStep = 100;  // 100m squares
    
    const worldSize = map.worldSizeM;
    const stepsX = Math.ceil(worldSize / majorStep);
    const stepsY = Math.ceil(worldSize / majorStep);

    // Major Grid (1km)
    for (let i = 0; i <= stepsX; i++) {
      const x = i * majorStep;
      if (x > worldSize) continue;
      const pStart = worldToPx({ x, y: 0 });
      const pEnd = worldToPx({ x, y: worldSize });

      lines.push(<line key={`major-x-${i}`} x1={pStart.x} y1={pStart.y} x2={pEnd.x} y2={pEnd.y} stroke="rgba(214,255,58,0.3)" strokeWidth={1.5} />);
      
      // Labels for X (Easting) - Kilometer index (e.g. 01, 02)
      const labelStr = Math.floor(x / 1000).toString().padStart(2, "0");
      labels.push(
        <text key={`label-x-${i}`} x={pStart.x + 4} y={size.h - 8} fontSize={11} fontWeight="bold" fill="rgba(214,255,58,0.7)" fontFamily="ui-monospace, monospace">
          {labelStr}
        </text>
      );
    }
    
    for (let j = 0; j <= stepsY; j++) {
      const y = j * majorStep;
      if (y > worldSize) continue;
      const pStart = worldToPx({ x: 0, y });
      const pEnd = worldToPx({ x: worldSize, y });

      lines.push(<line key={`major-y-${j}`} x1={pStart.x} y1={pStart.y} x2={pEnd.x} y2={pEnd.y} stroke="rgba(214,255,58,0.3)" strokeWidth={1.5} />);
      
      // Labels for Y (Northing) - Kilometer index
      const labelStr = Math.floor(y / 1000).toString().padStart(2, "0");
      labels.push(
        <text key={`label-y-${j}`} x={8} y={pStart.y - 4} fontSize={11} fontWeight="bold" fill="rgba(214,255,58,0.7)" fontFamily="ui-monospace, monospace">
          {labelStr}
        </text>
      );
    }

    // Minor Grid (100m) - Only show if zoomed in enough
    if (scale > 3) {
      const minorStepsX = Math.ceil(worldSize / minorStep);
      const minorStepsY = Math.ceil(worldSize / minorStep);
      for (let i = 0; i <= minorStepsX; i++) {
        if (i % 10 === 0) continue; // Skip major lines
        const x = i * minorStep;
        if (x > worldSize) continue;
        const pStart = worldToPx({ x, y: 0 });
        const pEnd = worldToPx({ x, y: worldSize });

        lines.push(<line key={`minor-x-${i}`} x1={pStart.x} y1={pStart.y} x2={pEnd.x} y2={pEnd.y} stroke="rgba(214,255,58,0.15)" strokeWidth={0.5} />);
        
        // Hectometer labels (e.g. 015) when zoomed in deep
        if (scale > 6) {
          const subLabel = Math.floor(x / 100).toString().padStart(3, "0");
          labels.push(
            <text key={`sub-label-x-${i}`} x={pStart.x + 2} y={size.h - 6} fontSize={8} fill="rgba(214,255,58,0.3)" fontFamily="ui-monospace, monospace">
              {subLabel}
            </text>
          );
        }
      }
      for (let j = 0; j <= minorStepsY; j++) {
        if (j % 10 === 0) continue; // Skip major lines
        const y = j * minorStep;
        if (y > worldSize) continue;
        const pStart = worldToPx({ x: 0, y });
        const pEnd = worldToPx({ x: worldSize, y });

        lines.push(<line key={`minor-y-${j}`} x1={pStart.x} y1={pStart.y} x2={pEnd.x} y2={pEnd.y} stroke="rgba(214,255,58,0.15)" strokeWidth={0.5} />);

        if (scale > 6) {
          const subLabel = Math.floor(y / 100).toString().padStart(3, "0");
          labels.push(
            <text key={`sub-label-y-${j}`} x={4} y={pStart.y - 2} fontSize={8} fill="rgba(214,255,58,0.3)" fontFamily="ui-monospace, monospace">
              {subLabel}
            </text>
          );
        }
      }
    }

    return { lines, labels };
  }, [map, worldToPx, size, scale]);

  return (
    <div className="panel p-3 space-y-2 flex flex-col h-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="section-title flex items-center">
          <span className="text-zinc-600 mr-1">TAC:</span>{t('map.title')}
          <InfoHint
            side="bottom"
            width={320}
            text={
              <>
                Click the map to drop your <span className="text-emerald-400">Gun</span> or{" "}
                <span className="text-red-400">Target</span> marker (toggle below). You
                can also <b>drag</b> the G/T markers to fine-tune. Yellow dashed line
                is the line of fire. <b>Range rings</b> show min/max for each charge;
                the active charge is solid.
              </>
            }
          />
        </span>
        <div className="flex items-center gap-1">
           <select
             className="field !py-1 !text-xs"
             title="Switch map. Built-in maps don't need calibration; uploaded maps may."
             value={map.id}
             onChange={(e) => setMapId(e.target.value)}
           >
             {maps.map((m) => (
               <option key={m.id} value={m.id}>
                 {m.name} · {(m.worldSizeM / 1000).toFixed(1)}km
               </option>
             ))}
           </select>
           {isPremium ? (
             <>
               <Tooltip
                 side="bottom"
                 width={300}
                 content={
                   <>
                     <b>Upload a custom map image.</b>
                     <br />· Format: <b>PNG / JPG / WebP</b> (any image).
                     <br />· Use a top-down screenshot of the in-game map (full map, square).
                     <br />· Set the <b>world size (m)</b> next to the button to match the
                     actual game world dimensions (e.g. <b>12800</b> for Everon, <b>4096</b>{" "}
                     for Arland).
                     <br />· After upload, use <b>Calibrate</b> to map two known points
                     exactly (recommended for accuracy).
                   </>
                 }
               >
                 <button
                   className="btn"
                   onClick={() => fileRef.current?.click()}
                   title="Upload a PNG/JPG/WebP map screenshot. Set world size first to match the game world."
                 >
                   {t('map.upload')}
                 </button>
               </Tooltip>
               <Tooltip
                 side="bottom"
                 width={240}
                 content={
                   <>
                     World size in <b>meters</b> for the uploaded map. Examples: Everon =
                     12800, Arland = 4096. Used to convert clicks to coordinates.
                   </>
                 }
               >
                 <input
                   className="field !py-1 !text-xs w-20"
                   type="number"
                   min={256}
                   max={20480}
                   value={customSize}
                   onChange={(e) => setCustomSize(e.target.value)}
                   title="World size in meters for the next uploaded map (e.g. 8192 or 12800)."
                   placeholder="size m"
                 />
               </Tooltip>
               <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/*"
                  className="hidden"
                  onChange={handleFile}
                />
                {!map.builtin && (
                  <button
                    className="btn !py-1 !px-2 !text-[10px] text-red-400 border-red-500/40 hover:bg-red-500/10"
                    onClick={() => {
                      if (confirm(`Delete custom map "${map.name}"?`)) {
                        onDeleteMap(map.id);
                        const firstBuiltin = maps.find((m) => m.builtin);
                        if (firstBuiltin) setMapId(firstBuiltin.id);
                      }
                    }}
                    title="Delete this custom map"
                  >
                    ✕
                  </button>
                )}
              </>
            ) : (
             <button
               className="btn flex items-center gap-1 text-zinc-500 border-zinc-700/60"
               onClick={onOpenLicense}
               title="Upload custom maps (Premium)"
             >
               🔒 {t('map.upload')}
             </button>
           )}
         </div>
       </div>
       {uploadError && (
         <div className="font-mono text-[11px] text-danger border border-danger/40 px-2 py-1">
           {uploadError}
         </div>
       )}

       <div className="flex items-center gap-1 flex-wrap">
         <button
           className={placeMode === "gun" ? "btn-primary" : "btn"}
           onClick={() => setPlaceMode("gun")}
           title="Next click on the map places the GUN position. (G)"
         >
           {t('map.placeGun')}
         </button>
         <button
           className={placeMode === "target" ? "btn-primary" : "btn"}
           onClick={() => setPlaceMode("target")}
           title="Next click on the map places the TARGET position. (T)"
         >
           {t('map.placeTarget')}
         </button>
         <button
           className="btn"
           onClick={swap}
           disabled={!gun || !target}
           title="Swap Gun and Target positions. (S)"
         >
           {t('map.swap')}
         </button>
         <label
           className="btn cursor-pointer select-none flex items-center gap-1"
           title="Show min/max range rings around the gun for the current charge (all charges shown dimmer)."
         >
           <input
             type="checkbox"
             className="accent-accent"
             checked={showRangeRings}
             onChange={(e) => setShowRangeRings(e.target.checked)}
           />
           {t('map.rings')}
         </label>
         {isPremium ? (
           <label
             className="btn cursor-pointer select-none flex items-center gap-1"
             title="Show Circular Error Probable (CEP) dispersion circle around target."
           >
             <input
               type="checkbox"
               className="accent-accent"
               checked={showCep}
               onChange={(e) => setShowCep(e.target.checked)}
             />
             {t('map.cep')}
           </label>
         ) : (
           <button
             type="button"
             className="btn flex items-center gap-1 text-zinc-500 border-zinc-700/60"
             onClick={onOpenLicense}
             title="Show Circular Error Probable (CEP) dispersion circle (Premium)"
           >
             🔒 {t('map.cep')}
           </button>
         )}
         {isPremium && !map.builtin && (
           <button
             className={calibStep > 0 ? "btn-primary animate-pulse" : "btn"}
             onClick={startCalibration}
             title="Calibrate a custom map by clicking three known points."
           >
             {calibStep > 0 && calibStep <= 3 ? t('map.calibrating', { step: calibStep }) : t('map.calibrate')}
           </button>
         )}
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 min-h-[400px] border border-line bg-black/60 select-none overflow-hidden"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onMouseUp={stopDrag}
        onContextMenu={(e) => panDrag && e.preventDefault()}
        style={{
          cursor: calibStep > 0
            ? "crosshair"
            : panDrag
              ? "grabbing"
              : dragging
                ? "grabbing"
                : "pointer",
        }}
      >
        {/* Wizard Overlay */}
        {calibStep > 0 && (
          <div className="absolute inset-0 z-40 flex flex-col pointer-events-none">
            {/* Top Instruction Bar */}
            <div className="bg-black/90 backdrop-blur-md border-b border-accent/40 p-4 pointer-events-auto flex items-center justify-between shadow-xl">
              <div className="flex flex-col gap-1">
                <div className="text-accent font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                  <span className="bg-accent text-black px-1.5 py-0.5 rounded-sm">{t('map.calibWizard')}</span>
                  {calibStep < 4 ? t('map.calibrating', { step: calibStep }) : t('map.calibReview')}
                </div>
                <div className="text-zinc-200 text-sm font-medium">
                  {calibStep === 1 && t('map.calibStep1')}
                  {calibStep === 2 && t('map.calibStep2')}
                  {calibStep === 3 && t('map.calibStep3')}
                  {calibStep === 4 && t('map.calibReview')}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn border-zinc-700 hover:bg-zinc-800 text-zinc-400"
                  onClick={() => setCalibStep(0)}
                >
                  {t('map.calibCancel')}
                </button>
                {calibStep > 1 && (
                  <button
                    className="btn border-zinc-700 hover:bg-zinc-800 text-zinc-400"
                    onClick={() => setCalibStep(calibStep - 1)}
                  >
                    {t('map.calibBack')}
                  </button>
                )}
                {calibStep < 4 ? (
                  <button
                    className="btn-primary"
                    disabled={!calibDraft || !calibDraft[`p${calibStep}` as keyof typeof calibDraft]}
                    onClick={() => setCalibStep(calibStep + 1)}
                  >
                    {t('map.calibNext')}
                  </button>
                ) : (
                  <button
                    className="btn-primary animate-pulse"
                    onClick={() => {
                      if (calibDraft) onCalibrate(calibDraft);
                      setCalibStep(0);
                    }}
                  >
                    {t('map.calibFinish')}
                  </button>
                )}
              </div>
            </div>

            {/* Contextual Coordinate Input Popup */}
            {calibStep <= 3 && calibDraft?.[`p${calibStep}` as keyof typeof calibDraft] && (() => {
              const p = calibDraft[`p${calibStep}` as keyof typeof calibDraft]!;
              const px = worldToPx(pxToWorld({ x: (p.px.x / 1000) * size.w, y: (p.px.y / 1000) * size.h }));
              return (
                <div 
                  className="absolute pointer-events-auto bg-black/95 border border-accent/60 p-3 rounded shadow-2xl w-60 flex flex-col gap-2 z-50 animate-in fade-in zoom-in duration-200"
                  style={{ 
                    left: Math.min(size.w - 250, Math.max(10, px.x + 20)), 
                    top: Math.min(size.h - 160, Math.max(80, px.y - 60)) 
                  }}
                >
                  <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-tighter">{t('map.calibWorldPos')}</div>
                  <div className="grid grid-cols-2 gap-1">
                    <input
                      ref={calibXRef}
                      className="field !py-1 !px-2 !text-xs"
                      placeholder="World X"
                      value={calibWorldInput.x}
                      onChange={(e) => {
                        const nextX = e.target.value;
                        setCalibWorldInput(v => ({ ...v, x: nextX }));
                        const next = { ...calibDraft, [`p${calibStep}`]: { ...p, world: { ...p.world, x: Number(nextX) || 0 } } };
                        setCalibDraft(next);
                      }}
                    />
                    <input
                      ref={calibYRef}
                      className="field !py-1 !px-2 !text-xs"
                      placeholder="World Y"
                      value={calibWorldInput.y}
                      onChange={(e) => {
                        const nextY = e.target.value;
                        setCalibWorldInput(v => ({ ...v, y: nextY }));
                        const next = { ...calibDraft, [`p${calibStep}`]: { ...p, world: { ...p.world, y: Number(nextY) || 0 } } };
                        setCalibDraft(next);
                      }}
                    />
                  </div>
                  <div className="flex gap-1">
                    <button 
                      className="btn !py-1 !text-[9px] flex-1"
                      onClick={() => {
                        if (gun) {
                          setCalibWorldInput({ x: gun.x.toFixed(0), y: gun.y.toFixed(0) });
                          const next = { ...calibDraft, [`p${calibStep}`]: { ...p, world: { x: gun.x, y: gun.y } } };
                          setCalibDraft(next);
                        }
                      }}
                      disabled={!gun}
                    >
                      Use Gun
                    </button>
                    <button 
                      className="btn !py-1 !text-[9px] flex-1"
                      onClick={() => {
                        if (target) {
                          setCalibWorldInput({ x: target.x.toFixed(0), y: target.y.toFixed(0) });
                          const next = { ...calibDraft, [`p${calibStep}`]: { ...p, world: { x: target.x, y: target.y } } };
                          setCalibDraft(next);
                        }
                      }}
                      disabled={!target}
                    >
                      Use Target
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        {!isPremium && !map.builtin && (
           <div className="absolute inset-0 bg-[#06070adc]/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center space-y-4 font-mono select-none">
             <span className="text-amber-400 text-3xl">🔒</span>
             <div className="text-zinc-200 font-semibold tracking-[0.2em] text-sm uppercase">
               CUSTOM MAPS LOCKED
             </div>
             <p className="text-zinc-400 text-xs max-w-sm leading-relaxed">
               Custom map uploads and calibration require a Premium license.
             </p>
             <div className="text-[10px] text-zinc-500 max-w-sm">
               Use built-in maps (Everon, Arland) or unlock premium features via Telegram Bot.
             </div>
             <div className="flex gap-3 pt-2">
               <button
                 type="button"
                 className="btn border-zinc-700 text-zinc-400 hover:border-zinc-500 text-xs px-4 py-2"
                 onClick={() => {
                   const firstBuiltin = maps.find((m) => m.builtin);
                   if (firstBuiltin) {
                     setMapId(firstBuiltin.id);
                   }
                 }}
               >
                 Use Built-in Map
               </button>
               <button
                 type="button"
                 className="btn-primary text-xs px-5 py-2 uppercase tracking-wider font-semibold animate-pulse"
                 onClick={onOpenLicense}
               >
                 Unlock Premium
               </button>
             </div>
           </div>
         )}
        <div
          className="absolute"
          style={{
            width: size.w,
            height: size.h,
            left: 0,
            top: 0,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
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
          <svg className="absolute inset-0" width={size.w} height={size.h}>
            {/* Arma-style Grid System */}
            {gridContent.lines}
            {gridContent.labels}

            {gun && rings.map((r, i) => {
              const c = worldToPx(gun);
              return (
                <g key={`ring-${i}`}>
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={r.r}
                    fill="none"
                    stroke={r.color}
                    strokeDasharray={r.dash}
                    strokeWidth={1}
                  />
                  {r.label && (
                    <text
                      x={c.x + r.r + 2}
                      y={c.y + 4}
                      fontSize={9}
                      fontFamily="ui-monospace, monospace"
                      fill={r.color}
                    >
                      {r.label}
                    </text>
                  )}
                </g>
              );
            })}
            {showLine && gun && target && (() => {
              const a = worldToPx(gun);
              const b = worldToPx(target);
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              return (
                <g>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="#d6ff3a"
                    strokeDasharray="4 3"
                    strokeWidth={1}
                  />
                  {rangeM !== null && (
                    <text
                      x={mx + 6}
                      y={my - 6}
                      fontSize={11}
                      fontFamily="ui-monospace, monospace"
                      fill="#d6ff3a"
                    >
                      {rangeM.toFixed(0)} m
                    </text>
                  )}
                </g>
              );
            })()}
            {isPremium && showCep && gun && target && (() => {
              const b = worldToPx(target);
              const dist = Math.hypot(target.x - gun.x, target.y - gun.y);
              const cepM = dist * 0.003; // 3 mils dispersion
              const cepPx = metersToPx(target, cepM);
              return (
                <g>
                  <circle
                    cx={b.x}
                    cy={b.y}
                    r={cepPx}
                    fill="rgba(248, 113, 113, 0.03)"
                    stroke="#f87171"
                    strokeDasharray="2 2"
                    strokeWidth={1}
                    className="animate-pulse"
                  />
                  <text
                    x={b.x + cepPx + 4}
                    y={b.y + 3}
                    fontSize={9}
                    fontFamily="ui-monospace, monospace"
                    fill="#f87171"
                    className="select-none"
                  >
                    CEP ±{cepM.toFixed(1)}m
                  </text>
                </g>
              );
            })()}
            {/* === Satellite crosshair tracking guidelines === */}
            {cursor && (() => {
              const cp = worldToPx(cursor);
              return (
                <g>
                  {/* Horizontal tracking line */}
                  <line
                    x1={0} y1={cp.y} x2={size.w} y2={cp.y}
                    stroke="rgba(214, 255, 58, 0.08)"
                    strokeDasharray="2 4"
                    strokeWidth={0.5}
                  />
                  {/* Vertical tracking line */}
                  <line
                    x1={cp.x} y1={0} x2={cp.x} y2={size.h}
                    stroke="rgba(214, 255, 58, 0.08)"
                    strokeDasharray="2 4"
                    strokeWidth={0.5}
                  />
                  {/* Crosshair center diamond */}
                  <rect
                    x={cp.x - 3} y={cp.y - 3} width={6} height={6}
                    fill="none" stroke="rgba(214, 255, 58, 0.25)" strokeWidth={0.5}
                    transform={`rotate(45 ${cp.x} ${cp.y})`}
                  />
                </g>
              );
            })()}
            {markers.map((m, i) => {
              const isCalib = m.which && m.which.startsWith("p");
              return (
                <g
                  key={i}
                  transform={`translate(${m.pos.x},${m.pos.y})`}
                  style={{ cursor: m.which ? "grab" : "default" }}
                  onMouseDown={(e) => m.which && startDrag(e, m.which)}
                >
                  {isCalib ? (
                    <g className="animate-in fade-in duration-500">
                      {/* Crosshair lines */}
                      <line x1={-12} y1={0} x2={12} y2={0} stroke={m.color} strokeWidth={1} />
                      <line x1={0} y1={-12} x2={0} y2={12} stroke={m.color} strokeWidth={1} />
                      <circle r={6} fill="none" stroke={m.color} strokeWidth={1} />
                      <circle r={1.5} fill={m.color} />
                    </g>
                  ) : (
                    <>
                      {/* Outer radar pulse ring */}
                      {m.which && (
                        <circle r={18} fill="none" stroke={m.color} strokeOpacity={0.12} strokeWidth={0.5}>
                          <animate attributeName="r" values="12;22" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="stroke-opacity" values="0.2;0" dur="2s" repeatCount="indefinite" />
                        </circle>
                      )}
                      {/* Inner glow ring */}
                      {m.which && (
                        <circle r={11} fill="none" stroke={m.color} strokeOpacity={0.35} strokeWidth={1} />
                      )}
                      {/* Core marker dot */}
                      <circle r={7} fill={m.color} stroke="#000" strokeWidth={1} />
                    </>
                  )}
                  {/* Marker label */}
                  <text
                    x={isCalib ? 8 : 12}
                    y={isCalib ? -8 : 4}
                    fontSize={isCalib ? 10 : 11}
                    fontFamily="ui-monospace, monospace"
                    fill={m.color}
                    style={{ textShadow: `0 0 6px ${m.color}`, fontWeight: isCalib ? "bold" : "normal" }}
                  >
                    {m.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="absolute top-2 right-2 pointer-events-none" title="North">
          <svg width="34" height="34" viewBox="0 0 34 34">
            <circle cx="17" cy="17" r="15" fill="rgba(0,0,0,0.55)" stroke="rgba(214,255,58,0.4)" />
            <polygon points="17,4 21,18 17,15 13,18" fill="#d6ff3a" />
            <text x="17" y="29" fontSize="9" fontFamily="ui-monospace, monospace" fill="#d6ff3a" textAnchor="middle">
              {t('map.north')}
            </text>
          </svg>
        </div>
        <div className="absolute top-2 left-2 flex flex-col gap-1 font-mono text-[10px]" title="Map zoom: wheel to zoom, Shift+drag or middle-button-drag to pan.">
          <button
            className="btn !py-0.5 !px-1.5 !text-[10px] bg-black/70"
            onClick={() => {
              const a = { x: size.w / 2, y: size.h / 2 };
              zoomAt(1.4, a);
            }}
            title="Zoom in (wheel up)"
          >
            +
          </button>
          <button
            className="btn !py-0.5 !px-1.5 !text-[10px] bg-black/70"
            onClick={() => {
              const a = { x: size.w / 2, y: size.h / 2 };
              zoomAt(1 / 1.4, a);
            }}
            title="Zoom out (wheel down)"
          >
            −
          </button>
          <button
            className="btn !py-0.5 !px-1.5 !text-[10px] bg-black/70"
            onClick={resetView}
            disabled={scale === 1 && pan.x === 0 && pan.y === 0}
            title="Reset zoom and pan"
          >
            ⌂
          </button>
          <div className="bg-black/70 border border-line px-1 py-0.5 text-accent text-center">
            {scale.toFixed(1)}×
          </div>
        </div>
        {cursor && (() => {
          const gx = Math.floor(cursor.x / 10).toString().padStart(3, "0");
          const gy = Math.floor(cursor.y / 10).toString().padStart(3, "0");
          return (
            <div
              className="absolute bottom-1 right-1 font-mono text-[10px] text-accent/90 bg-black/70 px-1.5 py-0.5 border border-accentDim/40 pointer-events-none leading-tight text-right"
              title="Cursor world coordinates (meters) and Arma-style 6-digit grid (10 m precision)"
            >
              <div>X {cursor.x.toFixed(0)} · Y {cursor.y.toFixed(0)}</div>
              <div className="text-zinc-400">{t('map.grid')} {gx} {gy}</div>
            </div>
          );
        })()}

        {/* Magnifier Overlay */}
        {magnifierPos && map.image && (() => {
          const cp = worldToPx(magnifierPos);
          // Screen pixels in the container
          const scx = cp.x * scale + pan.x;
          const scy = cp.y * scale + pan.y;
          
          const magSize = 140;
          const zoom = 4;
          const sourceX = (cp.x / size.w) * 100;
          const sourceY = (cp.y / size.h) * 100;

          return (
            <div
              className="absolute pointer-events-none border-2 border-accent shadow-2xl rounded-sm overflow-hidden z-50 bg-black"
              style={{
                width: magSize,
                height: magSize,
                left: Math.min(size.w - magSize - 10, Math.max(10, scx - magSize / 2)),
                top: scy - magSize - 20 < 10 ? scy + 20 : scy - magSize - 20,
              }}
            >
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `url(${map.image})`,
                  backgroundPosition: `${sourceX}% ${sourceY}%`,
                  backgroundSize: `${100 * zoom}%`,
                  imageRendering: "pixelated",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-[1px] bg-accent/40" />
                <div className="absolute w-[1px] h-full bg-accent/40" />
                <div className="w-2 h-2 border border-accent rounded-full shadow-[0_0_8px_rgba(214,255,58,0.8)]" />
              </div>
              <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 text-[8px] font-mono text-accent">
                MAG {zoom}x
              </div>
            </div>
          );
        })()}
      </div>
      <div className="font-mono text-[10px] text-zinc-500 flex items-center gap-2 flex-wrap">
        <span>
          {t('map.placeHelp', { mode: placeMode === "gun" ? "GUN" : "TARGET", size: map.worldSizeM })}
        </span>
        {rangeM !== null && (
          <span className="text-zinc-400">
            · {t('map.lof')}: <span className="text-accent">{rangeM.toFixed(0)} m</span>
          </span>
        )}
      </div>
    </div>
  );
}
