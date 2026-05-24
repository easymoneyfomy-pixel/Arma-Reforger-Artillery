import { useEffect, useMemo, useState } from 'react';
import { WeaponPanel } from './components/WeaponPanel';
import { FireSolutionPanel } from './components/FireSolutionPanel';
import { MapView } from './components/MapView';
import { CombatLog } from './components/CombatLog';
import { SpotterCorrection } from './components/SpotterCorrection';
import { CustomMapDialog } from './components/CustomMapDialog';
import { WEAPONS } from './lib/weapons';
import { solveFireMission } from './lib/solver';
import { BASE_MAPS } from './lib/maps';
import {
  loadCustomMaps,
  loadMissions,
  saveCustomMaps,
  saveMissions,
} from './lib/storage';
import type { FireMission, MapData, Point3D } from './types';

interface InputsState {
  weaponId: string;
  ammoId: string;
  chargeId: string | null;
  autoCharge: boolean;
  gun: Point3D;
  target: Point3D;
}

const DEFAULT_INPUTS: InputsState = {
  weaponId: WEAPONS[0]?.id ?? '',
  ammoId: WEAPONS[0]?.ammo[0]?.id ?? '',
  chargeId: null,
  autoCharge: true,
  gun: { x: 4000, y: 4000, z: 50 },
  target: { x: 5600, y: 5200, z: 80 },
};

export default function App() {
  const [inputs, setInputs] = useState<InputsState>(DEFAULT_INPUTS);
  const [impact, setImpact] = useState<Point3D | null>(null);
  const [missions, setMissions] = useState<FireMission[]>(() => loadMissions());
  const [customMaps, setCustomMaps] = useState<MapData[]>(() => loadCustomMaps());
  const [activeMapId, setActiveMapId] = useState<string>(BASE_MAPS[0]?.id ?? '');
  const [showCustomMapDialog, setShowCustomMapDialog] = useState(false);

  const allMaps = useMemo(() => [...BASE_MAPS, ...customMaps], [customMaps]);

  // Persist
  useEffect(() => {
    saveMissions(missions);
  }, [missions]);
  useEffect(() => {
    saveCustomMaps(customMaps);
  }, [customMaps]);

  // Solve any time inputs change.
  const solveResult = useMemo(
    () =>
      solveFireMission({
        weaponId: inputs.weaponId,
        ammoId: inputs.ammoId,
        chargeId: inputs.autoCharge ? null : inputs.chargeId,
        gun: inputs.gun,
        target: inputs.target,
      }),
    [inputs.weaponId, inputs.ammoId, inputs.chargeId, inputs.autoCharge, inputs.gun, inputs.target]
  );

  function update(patch: Partial<InputsState>) {
    setInputs((prev) => ({ ...prev, ...patch }));
  }

  function logMission() {
    if (!solveResult.solution) return;
    const mission: FireMission = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      weaponId: inputs.weaponId,
      ammoId: inputs.ammoId,
      chargeId: solveResult.solution.chargeId,
      gun: inputs.gun,
      target: inputs.target,
      solution: solveResult.solution,
    };
    setMissions((prev) => [mission, ...prev].slice(0, 100));
  }

  function recallMission(m: FireMission) {
    setInputs({
      weaponId: m.weaponId,
      ammoId: m.ammoId,
      chargeId: m.chargeId,
      autoCharge: false,
      gun: m.gun,
      target: m.target,
    });
  }

  function commitCustomMap(map: MapData) {
    setCustomMaps((prev) => [...prev, map]);
    setActiveMapId(map.id);
    setShowCustomMapDialog(false);
  }

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 grid grid-cols-12 gap-3 p-3 max-w-[1600px] mx-auto w-full">
        {/* Left column: inputs */}
        <div className="col-span-12 lg:col-span-3 space-y-3">
          <WeaponPanel
            weaponId={inputs.weaponId}
            ammoId={inputs.ammoId}
            chargeId={inputs.chargeId}
            autoCharge={inputs.autoCharge}
            gun={inputs.gun}
            target={inputs.target}
            onChange={update}
          />
        </div>

        {/* Center column: map + log */}
        <div className="col-span-12 lg:col-span-6 space-y-3">
          <MapView
            maps={allMaps}
            activeMapId={activeMapId}
            onSelectMap={setActiveMapId}
            gun={inputs.gun}
            target={inputs.target}
            impact={impact}
            onSetGun={(p) => update({ gun: { x: p.x, y: p.y, z: inputs.gun.z } })}
            onSetTarget={(p) =>
              update({ target: { x: p.x, y: p.y, z: inputs.target.z } })
            }
            onOpenCustomMap={() => setShowCustomMapDialog(true)}
          />
          <CombatLog
            missions={missions}
            onRecall={recallMission}
            onDelete={(id) => setMissions((prev) => prev.filter((m) => m.id !== id))}
            onClear={() => setMissions([])}
          />
        </div>

        {/* Right column: fire solution + spotter */}
        <div className="col-span-12 lg:col-span-3 space-y-3">
          <FireSolutionPanel
            solution={solveResult.solution}
            onSave={logMission}
            onMarkImpact={() =>
              setImpact({
                x: inputs.target.x + 25,
                y: inputs.target.y - 15,
                z: inputs.target.z,
              })
            }
          />
          <SpotterCorrection
            weaponId={inputs.weaponId}
            ammoId={inputs.ammoId}
            chargeId={inputs.chargeId}
            autoCharge={inputs.autoCharge}
            gun={inputs.gun}
            target={inputs.target}
            impact={impact}
            onImpactChange={setImpact}
            onApplyCorrection={(t) => {
              update({ target: t });
              setImpact(null);
            }}
          />
        </div>
      </main>

      <Footer />

      <CustomMapDialog
        open={showCustomMapDialog}
        onClose={() => setShowCustomMapDialog(false)}
        onCommit={commitCustomMap}
      />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-line bg-bg-panel/80 backdrop-blur-sm">
      <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-accent-glow text-lg tracking-widest">◣ ARTY-NET</span>
          <span className="text-muted text-[10px] uppercase tracking-widest">
            Arma Reforger · Artillery Computer
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-[10px] text-muted">
          <span className="chip chip-on">ONLINE</span>
          <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line bg-bg-panel/80 backdrop-blur-sm">
      <div className="max-w-[1600px] mx-auto px-4 py-1.5 text-[10px] uppercase tracking-widest text-muted flex items-center gap-4 flex-wrap">
        <span>Grid: MGRS-style</span>
        <span>·</span>
        <span>Angles: NATO mils (6400 / circle)</span>
        <span>·</span>
        <span>Bearings: from gun → target, 0° = North</span>
        <span className="ml-auto">v0.1 · Field Computer</span>
      </div>
    </footer>
  );
}
