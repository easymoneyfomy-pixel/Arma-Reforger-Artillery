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

  const [placeMode, setPlaceMode] = useState<"gun" | "target">("gun");
  const [showRangeRings, setShowRangeRings] = useState(true);
  const [helpOpen, setHelpOpen] = useState(() => {
    return !loadJSON<boolean>(HELP_SEEN_KEY, false);
  });

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
  }

  function loadMission(m: Mission) {
    setWeaponId(m.weaponId);
    setAmmoId(m.ammoId);
    setChargeId(m.chargeId);
    setAutoCharge(false);
    setGun(vecToStr(m.gun));
    setTarget(vecToStr(m.target));
  }

  function deleteMission(id: string) {
    const next = missions.filter((m) => m.id !== id);
    setMissions(next);
    saveJSON(STORAGE.MISSIONS, next);
  }

  function clearMissions() {
    setMissions([]);
    saveJSON(STORAGE.MISSIONS, []);
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
  }

  function openHelp() {
    setHelpOpen(true);
  }
  function closeHelp() {
    setHelpOpen(false);
    saveJSON(HELP_SEEN_KEY, true);
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
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse glow-active" />
            <span className="font-mono text-sm tracking-[0.18em] uppercase text-zinc-200" style={{ textShadow: '0 0 20px rgba(214, 255, 58, 0.15)' }}>
              Arma Reforger · Artillery FDC
            </span>
            <span className="font-mono text-[10px] text-zinc-600">v0.3</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="font-mono text-[10px] text-zinc-500 hidden md:block">
              {weapon.name} · {ammo.name} ·{" "}
              <span className="text-accent">{solution?.chargeLabel ?? "—"}</span>
            </div>
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
          <RightPanel solution={mergedSolution} onSave={saveMission} />
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

      <footer className="border-t border-line py-2 text-center font-mono text-[10px] text-zinc-600">
        Tables: M252 81mm · 2B14 Podnos 82mm · M120 120mm · M119A2 105mm · D-30 122mm · M777 155mm · Mils NATO (6400/circle) · Local-only data
      </footer>

      <HelpModal open={helpOpen} onClose={closeHelp} />
    </div>
  );
}
