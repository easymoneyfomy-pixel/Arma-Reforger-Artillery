import { useEffect, useMemo, useState } from "react";
import weaponsData from "./data/weapons.json";
import mapsData from "./data/maps";
import type { MapDef, Mission, Vec3, Weapon } from "./types";
import { computeSolution, pickOptimalCharge } from "./lib/ballistics";
import { STORAGE, loadJSON, saveJSON } from "./lib/storage";
import LeftPanel from "./components/LeftPanel";
import RightPanel from "./components/RightPanel";
import MapView from "./components/MapView";
import HistoryPanel from "./components/HistoryPanel";
import CorrectionPanel from "./components/CorrectionPanel";
import HelpModal from "./components/HelpModal";

const WEAPONS = weaponsData as Weapon[];
const BUILTIN_MAPS = mapsData as MapDef[];

type StrVec = { x: string; y: string; z: string };

function toVec(s: StrVec): Vec3 | null {
  const x = Number(s.x);
  const y = Number(s.y);
  const z = Number(s.z || "0");
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
  if (!s.x || !s.y) return null;
  return { x, y, z };
}

function vecToStr(v: Vec3): StrVec {
  return { x: String(Math.round(v.x)), y: String(Math.round(v.y)), z: String(Math.round(v.z)) };
}

const HELP_SEEN_KEY = "ar_fdc_help_seen_v1";

function playHudSound(type: "click" | "success" | "warning" | "beep", enabled: boolean) {
  if (!enabled) return;
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } else if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(1100, ctx.currentTime);
      osc.frequency.setValueAtTime(1450, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.setValueAtTime(0.025, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === "warning") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "beep") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(750, ctx.currentTime);
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    }
  } catch (e) {
    // Ignore
  }
}

export default function App() {
  const [weaponId, setWeaponId] = useState(WEAPONS[0].id);
  const [ammoId, setAmmoId] = useState(WEAPONS[0].ammo[0].id);
  const [chargeId, setChargeId] = useState(WEAPONS[0].ammo[0].charges[0].id);
  const [autoCharge, setAutoCharge] = useState(true);

  const [maps, setMaps] = useState<MapDef[]>(() => {
    const stored = loadJSON<MapDef[]>(STORAGE.MAPS, []);
    return [...BUILTIN_MAPS, ...stored];
  });
  const [mapId, setMapId] = useState(maps[0].id);
  const map = maps.find((m) => m.id === mapId) ?? maps[0];

  const [gun, setGun] = useState<StrVec>({ x: "", y: "", z: "0" });
  const [target, setTarget] = useState<StrVec>({ x: "", y: "", z: "0" });

  const [missions, setMissions] = useState<Mission[]>(() => loadJSON<Mission[]>(STORAGE.MISSIONS, []));
  const [impactPoint, setImpactPoint] = useState<Vec3 | null>(null);

  const [presets, setPresets] = useState<Record<string, Vec3>>(() => {
    return loadJSON<Record<string, Vec3>>("ar_fdc_presets", {
      everon_airport: { x: 1400, y: 11000, z: 120 },
      arland_airbase: { x: 1200, y: 3200, z: 45 }
    });
  });

  function savePreset(name: string, pos: Vec3) {
    const key = name.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "_");
    if (!key) return;
    const next = { ...presets, [key]: pos };
    setPresets(next);
    saveJSON("ar_fdc_presets", next);
    playHudSound("success", soundEnabled);
  }

  function deletePreset(name: string) {
    const next = { ...presets };
    delete next[name];
    setPresets(next);
    saveJSON("ar_fdc_presets", next);
    playHudSound("click", soundEnabled);
  }

  function selectPreset(pos: Vec3, type: "gun" | "target") {
    const val = vecToStr(pos);
    if (type === "gun") {
      setGun(val);
    } else {
      setTarget(val);
    }
    playHudSound("beep", soundEnabled);
  }

  const [placeMode, setPlaceMode] = useState<"gun" | "target">("gun");
  const [showRangeRings, setShowRangeRings] = useState(true);
  const [helpOpen, setHelpOpen] = useState(() => {
    return !loadJSON<boolean>(HELP_SEEN_KEY, false);
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return loadJSON<boolean>("ar_fdc_sound_enabled", true);
  });
  const [isMounted, setIsMounted] = useState(false);

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    saveJSON("ar_fdc_sound_enabled", next);
    playHudSound("click", next);
  }

  useEffect(() => {
    if (!isMounted) {
      setIsMounted(true);
      return;
    }
    playHudSound("beep", soundEnabled);
  }, [weaponId, ammoId, chargeId, mapId]);

  const weapon = WEAPONS.find((w) => w.id === weaponId)!;
  const ammo = weapon.ammo.find((a) => a.id === ammoId) ?? weapon.ammo[0];

  const gunV = toVec(gun);
  const targetV = toVec(target);

  useEffect(() => {
    if (!autoCharge || !gunV || !targetV) return;
    const range = Math.hypot(targetV.x - gunV.x, targetV.y - gunV.y);
    const id = pickOptimalCharge(ammo, range);
    if (id && id !== chargeId) setChargeId(id);
  }, [autoCharge, gunV?.x, gunV?.y, targetV?.x, targetV?.y, ammoId, weaponId]);

  const solution = useMemo(() => {
    if (!gunV || !targetV) return null;
    return computeSolution(weapon, ammo, chargeId, gunV, targetV);
  }, [gunV, targetV, weapon, ammo, chargeId]);

  // Coordinate-bounds warnings derived locally
  const boundsWarning = useMemo(() => {
    const issues: string[] = [];
    const w = map.worldSizeM;
    function check(v: Vec3 | null, label: string) {
      if (!v) return;
      if (v.x < 0 || v.x > w) issues.push(`${label} X ${v.x.toFixed(0)} outside map 0–${w}`);
      if (v.y < 0 || v.y > w) issues.push(`${label} Y ${v.y.toFixed(0)} outside map 0–${w}`);
    }
    check(gunV, "Gun");
    check(targetV, "Target");
    return issues;
  }, [gunV?.x, gunV?.y, targetV?.x, targetV?.y, map.worldSizeM]);

  const mergedSolution = useMemo(() => {
    if (!solution) return null;
    if (!boundsWarning.length) return solution;
    return { ...solution, warnings: [...boundsWarning, ...solution.warnings] };
  }, [solution, boundsWarning]);

  function saveMission() {
    if (!solution || !gunV || !targetV) return;
    const m: Mission = {
      id: Date.now().toString(36),
      ts: Date.now(),
      label: `${weapon.name} · ${ammo.name}`,
      weaponId,
      ammoId,
      chargeId,
      gun: gunV,
      target: targetV,
      solution,
    };
    const next = [m, ...missions].slice(0, 50);
    setMissions(next);
    saveJSON(STORAGE.MISSIONS, next);
    playHudSound("success", soundEnabled);
  }

  function loadMission(m: Mission) {
    setWeaponId(m.weaponId);
    setAmmoId(m.ammoId);
    setChargeId(m.chargeId);
    setAutoCharge(false);
    setGun(vecToStr(m.gun));
    setTarget(vecToStr(m.target));
    playHudSound("beep", soundEnabled);
  }

  function deleteMission(id: string) {
    const next = missions.filter((m) => m.id !== id);
    setMissions(next);
    saveJSON(STORAGE.MISSIONS, next);
    playHudSound("click", soundEnabled);
  }

  function clearMissions() {
    setMissions([]);
    saveJSON(STORAGE.MISSIONS, []);
    playHudSound("warning", soundEnabled);
  }

  function importMissions(extra: Mission[]) {
    const byId = new Map<string, Mission>();
    [...extra, ...missions].forEach((m) => byId.set(m.id, m));
    const next = Array.from(byId.values())
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 200);
    setMissions(next);
    saveJSON(STORAGE.MISSIONS, next);
  }

  function addMap(m: MapDef) {
    const next = [...maps, m];
    setMaps(next);
    saveJSON(
      STORAGE.MAPS,
      next.filter((mm) => !mm.builtin),
    );
  }

  function calibrate(cal: MapDef["calibration"]) {
    const next = maps.map((m) => (m.id === mapId ? { ...m, calibration: cal } : m));
    setMaps(next);
    saveJSON(
      STORAGE.MAPS,
      next.filter((mm) => !mm.builtin),
    );
  }

  function resetPositions() {
    setGun({ x: "", y: "", z: "0" });
    setTarget({ x: "", y: "", z: "0" });
    setImpactPoint(null);
    playHudSound("warning", soundEnabled);
  }

  function openHelp() {
    setHelpOpen(true);
    playHudSound("beep", soundEnabled);
  }
  function closeHelp() {
    setHelpOpen(false);
    saveJSON(HELP_SEEN_KEY, true);
    playHudSound("beep", soundEnabled);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
        return;
      }
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        setHelpOpen((v) => !v);
        e.preventDefault();
        return;
      }
      if (helpOpen) return;
      switch (e.key.toLowerCase()) {
        case "g":
          setPlaceMode("gun");
          break;
        case "t":
          setPlaceMode("target");
          break;
        case "s":
          if (gunV && targetV) {
            setGun(vecToStr(targetV));
            setTarget(vecToStr(gunV));
          }
          break;
        case "r":
          resetPositions();
          break;
        case "a":
          setAutoCharge(!autoCharge);
          break;
        default:
          return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [helpOpen, gunV?.x, gunV?.y, targetV?.x, targetV?.y, autoCharge]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-panel/60 backdrop-blur">
        <div className="max-w-[1700px] mx-auto px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {/* Animated Vector Radar */}
            <div className="relative w-8 h-8 flex items-center justify-center bg-black/40 border border-line/50 rounded-sm overflow-hidden hidden sm:flex">
              <svg className="w-7 h-7 text-accent" viewBox="0 0 100 100">
                {/* Outer Ring */}
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
                <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" />
                <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
                {/* Crosshairs */}
                <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.25" />
                <line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.25" />
                {/* Sweep Line */}
                <line x1="50" y1="50" x2="50" y2="5" stroke="currentColor" strokeWidth="1.5" className="radar-sweep-line" style={{ filter: 'drop-shadow(0 0 4px rgba(214, 255, 58, 0.6))' }} />
                {/* Blips */}
                <circle cx="35" cy="40" r="2" fill="currentColor" className="animate-ping" style={{ animationDelay: '1.2s', animationDuration: '4s' }} />
                <circle cx="35" cy="40" r="2.5" fill="currentColor" style={{ opacity: 0.8 }} />
                
                <circle cx="68" cy="62" r="1.5" fill="currentColor" className="animate-ping" style={{ animationDelay: '2.8s', animationDuration: '4s' }} />
                <circle cx="68" cy="62" r="2" fill="currentColor" style={{ opacity: 0.6 }} />
              </svg>
            </div>
            
            <div className="flex flex-col">
              <span className="font-mono text-sm tracking-[0.18em] uppercase text-zinc-200" style={{ textShadow: '0 0 20px rgba(214, 255, 58, 0.15)' }}>
                Arma Reforger · Artillery FDC
              </span>
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider">TACTICAL TELEMETRY HUD</span>
            </div>
            <span className="font-mono text-[10px] text-zinc-600 self-end mb-0.5">v1.0</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="font-mono text-[10px] text-zinc-500 hidden md:block">
              {weapon.name} · {ammo.name} ·{" "}
              <span className="text-accent">{solution?.chargeLabel ?? "—"}</span>
            </div>
            {/* Audio Toggle */}
            <button
              className={`btn !py-1 !px-2 !text-[10px] flex items-center gap-1.5 ${soundEnabled ? 'text-accent border-accent/40 bg-accentDim/10' : 'text-zinc-500 border-zinc-700'}`}
              onClick={toggleSound}
              title={soundEnabled ? "Disable HUD Audio Feedback" : "Enable HUD Audio Feedback"}
            >
              {soundEnabled ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  <span>SOUND [ON]</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                  <span>SOUND [OFF]</span>
                </>
              )}
            </button>
            <a
              href="https://t.me/Arma_Artillery_Bot"
              target="_blank"
              rel="noopener noreferrer"
              className="btn !py-1 !px-2 !text-[10px] text-accent border-accent/40 bg-accentDim/10 hover:bg-accentDim/20 flex items-center gap-1.5"
              title="Open FDC Telegram Bot"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent"></span>
              </span>
              <span>TELEGRAM BOT</span>
            </a>
            <button
              className="btn !py-1 !px-2 !text-[10px]"
              onClick={resetPositions}
              title="Clear gun, target and impact positions. (R)"
            >
              Reset
            </button>
            <button
              className="btn !py-1 !px-2 !text-[10px]"
              onClick={openHelp}
              title="Show quick-start help (? key)"
            >
              Help
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1700px] w-full mx-auto p-3 grid grid-cols-12 gap-3">
        <section className="col-span-12 lg:col-span-3 space-y-3">
          <LeftPanel
            weapons={WEAPONS}
            weaponId={weaponId}
            setWeaponId={setWeaponId}
            ammoId={ammoId}
            setAmmoId={setAmmoId}
            chargeId={chargeId}
            setChargeId={setChargeId}
            autoCharge={autoCharge}
            setAutoCharge={setAutoCharge}
            worldSizeM={map.worldSizeM}
            gun={gun}
            setGun={setGun}
            target={target}
            setTarget={setTarget}
            presets={presets}
            onSelectPreset={selectPreset}
            onSavePreset={savePreset}
            onDeletePreset={deletePreset}
            targetV={targetV}
            gunV={gunV}
          />
        </section>

        <section className="col-span-12 lg:col-span-6 flex flex-col gap-3 min-h-[500px]">
          <MapView
            map={map}
            maps={maps}
            setMapId={setMapId}
            onAddMap={addMap}
            onCalibrate={calibrate}
            gun={gunV}
            target={targetV}
            impact={impactPoint}
            setGun={(v) => setGun(vecToStr(v))}
            setTarget={(v) => setTarget(vecToStr(v))}
            placeMode={placeMode}
            setPlaceMode={setPlaceMode}
            charges={ammo.charges}
            activeChargeId={chargeId}
            showRangeRings={showRangeRings}
            setShowRangeRings={setShowRangeRings}
          />
        </section>

        <section className="col-span-12 lg:col-span-3 space-y-3">
          <RightPanel solution={mergedSolution} onSave={saveMission} soundEnabled={soundEnabled} />
          <CorrectionPanel
            gun={gunV}
            target={targetV}
            solution={solution}
            onApplyCorrection={(corr) => {
              setTarget(vecToStr(corr));
              setImpactPoint(null);
            }}
          />
          <HistoryPanel
            missions={missions}
            onLoad={loadMission}
            onDelete={deleteMission}
            onClear={clearMissions}
            onImport={importMissions}
          />
        </section>
      </main>

      <footer className="border-t border-line py-3 text-center font-mono text-[10px] text-zinc-600 space-y-1">
        <div>
          FDC Artillery Calculator v1.0 · Tables: M252 81mm · 2B14 Podnos 82mm · M120 120mm · M119A2 105mm · D-30 122mm · M777 155mm
        </div>
        <div className="text-zinc-700">
          Mils NATO (6400/circle) · All computations are 100% client-side · Zero server calls · © {new Date().getFullYear()} FDC Systems
        </div>
      </footer>

      <HelpModal open={helpOpen} onClose={closeHelp} />
    </div>
  );
}
