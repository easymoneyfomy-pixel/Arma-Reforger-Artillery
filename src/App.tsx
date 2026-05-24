import { useEffect, useMemo, useState } from "react";
import weaponsData from "./data/weapons.json";
import mapsData from "./data/maps.json";
import type { MapDef, Mission, Vec3, Weapon } from "./types";
import { computeSolution, pickOptimalCharge } from "./lib/ballistics";
import { STORAGE, loadJSON, saveJSON } from "./lib/storage";
import LeftPanel from "./components/LeftPanel";
import RightPanel from "./components/RightPanel";
import MapView from "./components/MapView";
import HistoryPanel from "./components/HistoryPanel";
import CorrectionPanel from "./components/CorrectionPanel";

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

  const weapon = WEAPONS.find((w) => w.id === weaponId)!;
  const ammo = weapon.ammo.find((a) => a.id === ammoId) ?? weapon.ammo[0];

  const gunV = toVec(gun);
  const targetV = toVec(target);

  // Auto-select charge based on range
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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-panel/60 backdrop-blur">
        <div className="max-w-[1700px] mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="font-mono text-sm tracking-[0.18em] uppercase text-zinc-200">
              Arma Reforger · Artillery FDC
            </span>
            <span className="font-mono text-[10px] text-zinc-600">v0.1</span>
          </div>
          <div className="font-mono text-[10px] text-zinc-500">
            {weapon.name} · {ammo.name} ·{" "}
            <span className="text-accent">{solution?.chargeLabel ?? "—"}</span>
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
          />
        </section>

        <section className="col-span-12 lg:col-span-3 space-y-3">
          <RightPanel solution={solution} onSave={saveMission} />
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
          />
        </section>
      </main>

      <footer className="border-t border-line py-2 text-center font-mono text-[10px] text-zinc-600">
        Tables: M252 81mm · 2B14 Podnos 82mm · M120 120mm · M119A2 105mm · D-30 122mm · M777 155mm · Mils NATO (6400/circle) · Local-only data
      </footer>
    </div>
  );
}
