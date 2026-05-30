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
    if (calibStep >= 1 || dragging) return cursor;
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
    function onKeyDown(e: KeyboardEvent) {
      if (!dragging || dragging === "gun" || dragging === "target") return;
      if (e.target instanceof HTMLInputElement) return;

      const step = e.shiftKey ? 10 : 1;
      let dx = 0, dy = 0;
      if (e.key === "ArrowLeft") dx = -step;
      else if (e.key === "ArrowRight") dx = step;
      else if (e.key === "ArrowUp") dy = -step;
      else if (e.key === "ArrowDown") dy = step;

      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        const pointId = dragging as "p1" | "p2" | "p3";
        if (calibDraft) {
          const p = calibDraft[pointId]!;
          // Move by pixels (stored as 0-1000 range)
          const pxPerUnit = 1000 / size.w;
          const next = {
            ...calibDraft,
            [pointId]: { 
              ...p, 
              px: { 
                x: Math.max(0, Math.min(1000, p.px.x + dx * pxPerUnit)), 
                y: Math.max(0, Math.min(1000, p.px.y + dy * pxPerUnit)) 
              } 
            },
          };
          setCalibDraft(next);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dragging, calibDraft, size]);

  function startCalibration() {
    setCalibStep(1);
    setCalibDraft(map.calibration ?? {
      p1: { px: { x: 250, y: 750 }, world: { x: 0, y: 0 } },
      p2: { px: { x: 750, y: 250 }, world: { x: map.worldSizeM, y: map.worldSizeM } },
    });
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (dragging || panDrag) return;
    
    // Prevent map clicks if we clicked on the coordinate popup or the top wizard bar
    const target = e.target as HTMLElement;
    if (target.closest('.calib-popup') || target.closest('.calib-bar')) return;

    const lp = eventLocalPx(e);
    const world = pxToWorld({ x: lp.x, y: lp.y });
    
    if (calibStep >= 1 && calibStep <= 3) {
      const pointId = `p${calibStep}` as "p1" | "p2" | "p3";
      
      // LOGIC IMPROVEMENT: If the point is already placed in this step, 
      // clicking the map shouldn't jump it. User should drag to refine.
      if (calibDraft?.[pointId]) return;

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
            <div className="calib-bar bg-black/90 backdrop-blur-md border-b border-accent/40 p-4 pointer-events-auto flex items-center justify-between shadow-xl">
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
                  className="calib-popup absolute pointer-events-auto bg-black/95 border border-accent/60 p-3 rounded shadow-2xl w-64 flex flex-col gap-3 z-50 animate-in fade-in zoom-in duration-200"
                  style={{ 
                    left: Math.min(size.w - 270, Math.max(10, px.x + 20)), 
                    top: Math.min(size.h - 220, Math.max(80, px.y - 60)) 
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setCalibStep(v => v + 1);
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div className="text-[10px] text-accent font-bold uppercase tracking-wider">Point P{calibStep} Settings</div>
                    <div className="text-[9px] text-zinc-500 font-mono">Use Arrows to fine-tune px</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[9px] text-zinc-500 uppercase font-mono">World Coordinates (m)</div>
                    <div className="grid grid-cols-2 gap-1">
                      <div className="relative">
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] text-zinc-600 font-bold">X</span>
                        <input
                          ref={calibXRef}
                          className="field !py-1 !pl-5 !pr-1 !text-xs w-full"
                          placeholder="0000"
                          value={calibWorldInput.x}
                          onChange={(e) => {
                            const nextX = e.target.value.replace(/[^0-9.-]/g, '');
                            setCalibWorldInput(v => ({ ...v, x: nextX }));
                            const next = { ...calibDraft, [`p${calibStep}`]: { ...p, world: { ...p.world, x: Number(nextX) || 0 } } };
                            setCalibDraft(next);
                          }}
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] text-zinc-600 font-bold">Y</span>
                        <input
                          ref={calibYRef}
                          className="field !py-1 !pl-5 !pr-1 !text-xs w-full"
                          placeholder="0000"
                          value={calibWorldInput.y}
                          onChange={(e) => {
                            const nextY = e.target.value.replace(/[^0-9.-]/g, '');
                            setCalibWorldInput(v => ({ ...v, y: nextY }));
                            const next = { ...calibDraft, [`p${calibStep}`]: { ...p, world: { ...p.world, y: Number(nextY) || 0 } } };
                            setCalibDraft(next);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[9px] text-zinc-500 uppercase font-mono">Quick Grid (6 or 8 digits)</div>
                    <input
                      className="field !py-1 !px-2 !text-xs w-full border-accent/20 focus:border-accent"
                      placeholder="e.g. 054 123"
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9 ]/g, '').trim();
                        const parts = val.split(/\s+/);
                        if (parts.length === 2) {
                          let x = parts[0], y = parts[1];
                          if (x.length === 3 && y.length === 3) { // 6-digit (100m)
                            const wx = parseInt(x) * 100;
                            const wy = parseInt(y) * 100;
                            setCalibWorldInput({ x: wx.toString(), y: wy.toString() });
                            setCalibDraft({ ...calibDraft, [`p${calibStep}`]: { ...p, world: { x: wx, y: wy } } });
                          } else if (x.length === 4 && y.length === 4) { // 8-digit (10m)
                            const wx = parseInt(x) * 10;
                            const wy = parseInt(y) * 10;
                            setCalibWorldInput({ x: wx.toString(), y: wy.toString() });
                            setCalibDraft({ ...calibDraft, [`p${calibStep}`]: { ...p, world: { x: wx, y: wy } } });
                          }
                        }
                      }}
                    />
                  </div>

                  <div className="flex gap-1 pt-1">
                    <button 
                      className="btn !py-1 !text-[9px] flex-1 bg-emerald-950/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
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
                      className="btn !py-1 !text-[9px] flex-1 bg-red-950/20 border-red-500/30 text-red-400 hover:bg-red-500/20"
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
              className="block w-full h-full object-fill opacity-90"
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
              const glowColor = m.color;
              return (
                <g
                  key={i}
                  transform={`translate(${m.pos.x},${m.pos.y})`}
                  style={{ cursor: m.which ? "grab" : "default" }}
                  onMouseDown={(e) => m.which && startDrag(e, m.which)}
                >
                  <defs>
                    <filter id={`glow-${i}`} x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="2.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  
                  {isCalib ? (
                    <g className="animate-in fade-in duration-500">
                      {/* High-contrast background for crosshair */}
                      <circle r={10} fill="rgba(0,0,0,0.4)" />
                      {/* Crosshair lines with white-black-white contrast */}
                      <line x1={-15} y1={0} x2={15} y2={0} stroke="black" strokeWidth={3} strokeLinecap="round" />
                      <line x1={-15} y1={0} x2={15} y2={0} stroke={m.color} strokeWidth={1.5} strokeLinecap="round" />
                      <line x1={0} y1={-15} x2={0} y2={15} stroke="black" strokeWidth={3} strokeLinecap="round" />
                      <line x1={0} y1={-15} x2={0} y2={15} stroke={m.color} strokeWidth={1.5} strokeLinecap="round" />
                      
                      <circle r={7} fill="none" stroke="black" strokeWidth={2} />
                      <circle r={7} fill="none" stroke={m.color} strokeWidth={1} />
                      
                      {/* Precise center dot */}
                      <circle r={1.5} fill="white" stroke="black" strokeWidth={0.5} />
                    </g>
                  ) : (
                    <g filter={`url(#glow-${i})`}>
                      {m.label === "G" ? (
                        /* Tactical Gun Icon: Artillery Unit Circle */
                        <g>
                          <circle r={11} fill="black" opacity={0.3} />
                          <circle r={9} fill={m.color} stroke="black" strokeWidth={2} />
                          <circle r={2.5} fill="white" stroke="black" strokeWidth={1} />
                          <path d="M-12,0 L12,0 M0,-12 L0,12" stroke="black" strokeWidth={0.5} opacity={0.4} />
                        </g>
                      ) : (
                        /* Tactical Target Icon: HUD Brackets */
                        <g>
                          <circle r={11} fill="black" opacity={0.3} />
                          {/* Outer Black Brackets for contrast */}
                          <g stroke="black" strokeWidth={3} fill="none" strokeLinecap="round">
                            <path d="M-10,-10 L-10,-4 M-10,-10 L-4,-10" />
                            <path d="M10,-10 L10,-4 M10,-10 L4,-10" />
                            <path d="M-10,10 L-10,4 M-10,10 L-4,10" />
                            <path d="M10,10 L10,4 M10,10 L4,10" />
                          </g>
                          {/* Colored Inner Brackets */}
                          <g stroke={m.color} strokeWidth={1.5} fill="none" strokeLinecap="round">
                            <path d="M-10,-10 L-10,-4 M-10,-10 L-4,-10" />
                            <path d="M10,-10 L10,-4 M10,-10 L4,-10" />
                            <path d="M-10,10 L-10,4 M-10,10 L-4,10" />
                            <path d="M10,10 L10,4 M10,10 L4,10" />
                          </g>
                          <circle r={1.5} fill="white" stroke="black" strokeWidth={0.5} />
                        </g>
                      )}
                      
                      {/* Outer pulse for G/T */}
                      {m.which && (
                        <circle r={18} fill="none" stroke={m.color} strokeOpacity={0.4} strokeWidth={1.5}>
                          <animate attributeName="r" values="10;24" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="stroke-opacity" values="0.6;0" dur="2s" repeatCount="indefinite" />
                        </circle>
                      )}
                    </g>
                  )}
                  
                  {/* Marker label with heavy drop shadow/outline for readability */}
                  <text
                    x={isCalib ? 12 : 14}
                    y={isCalib ? -12 : 8}
                    fontSize={isCalib ? 12 : 14}
                    fontFamily="ui-monospace, monospace"
                    fontWeight="900"
                    fill={m.color}
                    paintOrder="stroke"
                    stroke="black"
                    strokeWidth={3}
                    style={{ 
                      textShadow: `0 0 8px black, 0 0 3px black`,
                      letterSpacing: "0.05em"
                    }}
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
          
          const magSize = 180;
          const zoom = 8; // Higher zoom for precision
          
          // Pixel-based background position for absolute precision
          const bgX = -cp.x * zoom + magSize / 2;
          const bgY = -cp.y * zoom + magSize / 2;

          // Stable quadrant-based positioning to avoid jitter
          const isLeft = scx > size.w / 2;
          const isTop = scy > size.h / 2;
          
          return (
            <div
              className="absolute pointer-events-none border-2 border-accent/90 shadow-[0_30px_60px_rgba(0,0,0,0.6)] rounded-full overflow-hidden z-50 bg-black animate-in zoom-in duration-200"
              style={{
                width: magSize,
                height: magSize,
                // Position in the quadrant furthest from the cursor
                left: isLeft ? 20 : size.w - magSize - 20,
                top: isTop ? 80 : size.h - magSize - 40,
              }}
            >
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `url(${map.image})`,
                  backgroundPosition: `${bgX}px ${bgY}px`,
                  backgroundSize: `${size.w * zoom}px ${size.h * zoom}px`,
                  imageRendering: "pixelated",
                }}
              />
              {/* Scope-style scanlines */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%]" />
              
              {/* Precision Crosshair */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Long axis lines */}
                <div className="w-full h-[0.5px] bg-accent/40" />
                <div className="absolute w-[0.5px] h-full bg-accent/40" />
                
                {/* Sub-pixel markers */}
                <div className="absolute w-10 h-10 border border-accent/20 rounded-full" />
                <div className="absolute w-20 h-20 border border-accent/10 rounded-full" />
                
                {/* Center dot */}
                <div className="w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_12px_rgba(214,255,58,1)] z-10" />
              </div>

              {/* Readouts */}
              <div className="absolute top-3 left-0 right-0 text-center flex flex-col items-center gap-0.5">
                <span className="bg-black/80 px-2 py-0.5 rounded text-[8px] font-bold font-mono text-accent border border-accent/30 tracking-widest uppercase">
                  {zoom}X Zoom
                </span>
                <span className="bg-black/60 px-1.5 py-0.5 rounded text-[7px] font-mono text-zinc-400">
                  X:{magnifierPos.x.toFixed(0)} Y:{magnifierPos.y.toFixed(0)}
                </span>
              </div>
              
              {/* Lens glare effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
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
