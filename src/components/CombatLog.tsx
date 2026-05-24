import { Panel } from './Panel';
import { fmtMil, formatGrid } from '../lib/coordinates';
import type { FireMission } from '../types';
import { getAmmo, getWeapon } from '../lib/weapons';

interface Props {
  missions: FireMission[];
  onRecall: (m: FireMission) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export function CombatLog({ missions, onRecall, onDelete, onClear }: Props) {
  return (
    <Panel
      title="Combat Log"
      right={
        missions.length > 0 && (
          <button type="button" className="btn !px-2 !py-0.5 btn-danger" onClick={onClear}>
            Clear
          </button>
        )
      }
      bodyClassName="!p-0"
    >
      {missions.length === 0 ? (
        <div className="text-muted text-xs px-3 py-6 text-center">
          No missions logged yet.
        </div>
      ) : (
        <ul className="divide-y divide-line max-h-[280px] overflow-auto">
          {missions.map((m) => {
            const weapon = getWeapon(m.weaponId);
            const ammo = getAmmo(m.weaponId, m.ammoId);
            const date = new Date(m.timestamp);
            return (
              <li key={m.id} className="px-3 py-2 hover:bg-bg-raised/60 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-accent-glow font-medium truncate">
                        {weapon?.name ?? m.weaponId}
                      </span>
                      <span className="chip">{ammo?.name ?? m.ammoId}</span>
                      <span className="chip">C{m.chargeId}</span>
                    </div>
                    <div className="text-muted text-[10px] mt-0.5 grid grid-cols-2 gap-x-3 tabular-nums">
                      <span>GUN {formatGrid(m.gun, 4)}</span>
                      <span>TGT {formatGrid(m.target, 4)}</span>
                      <span>AZ {fmtMil(m.solution.bearingMils)} mil</span>
                      <span>EL {fmtMil(m.solution.elevationMils)} mil</span>
                      <span className="col-span-2">{date.toLocaleTimeString()} · {Math.round(m.solution.rangeFlat)} m · {m.solution.timeOfFlight.toFixed(1)} s</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button type="button" className="btn !px-2 !py-0.5 text-[10px]" onClick={() => onRecall(m)}>
                      Recall
                    </button>
                    <button type="button" className="btn !px-2 !py-0.5 text-[10px] btn-danger" onClick={() => onDelete(m.id)}>
                      Del
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
