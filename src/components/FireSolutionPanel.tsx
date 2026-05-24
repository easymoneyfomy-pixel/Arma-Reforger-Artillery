import { Panel } from './Panel';
import { fmtDeg, fmtMil } from '../lib/coordinates';
import type { FireSolution } from '../types';
import { getAmmo, getCharge, getWeapon } from '../lib/weapons';

interface Props {
  solution: FireSolution | null;
  onSave: () => void;
  onMarkImpact: () => void;
}

export function FireSolutionPanel({ solution, onSave, onMarkImpact }: Props) {
  if (!solution) {
    return (
      <Panel title="Fire Solution">
        <div className="text-muted text-sm py-12 text-center">
          Awaiting target data…
        </div>
      </Panel>
    );
  }

  const weapon = getWeapon(solution.weaponId);
  const ammo = getAmmo(solution.weaponId, solution.ammoId);
  const charge = getCharge(solution.weaponId, solution.ammoId, solution.chargeId);

  const oor = !solution.inRange;
  const tooLowAngle = solution.elevationMils < 700 && solution.inRange;

  return (
    <Panel
      title="Fire Solution"
      right={
        <div className="flex items-center gap-1">
          <span className={`chip ${solution.highAngle ? 'chip-on' : ''}`}>
            {solution.highAngle ? 'HIGH ANGLE' : 'LOW ANGLE'}
          </span>
          <span className={`chip ${oor ? 'border-danger text-danger' : 'chip-on'}`}>
            {oor ? 'OUT OF RANGE' : 'IN RANGE'}
          </span>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Azimuth (mils)" value={fmtMil(solution.bearingMils)} mono big />
          <Stat label="Elevation (mils)" value={fmtMil(solution.elevationMils)} mono big highlight />
          <Stat label="Azimuth (deg)" value={fmtDeg(solution.bearingDeg)} mono />
          <Stat label="Time of Flight" value={`${solution.timeOfFlight.toFixed(1)} s`} mono />
        </div>

        <div className="divider-h" />

        <div className="grid grid-cols-2 gap-3 text-xs">
          <KV k="Range (flat)" v={`${Math.round(solution.rangeFlat)} m`} />
          <KV k="Range (slant)" v={`${Math.round(solution.rangeSlant)} m`} />
          <KV k="Weapon" v={weapon?.name ?? '—'} />
          <KV k="Round" v={ammo?.name ?? '—'} />
          <KV k="Charge" v={charge?.label ?? '—'} />
          <KV
            k="Band"
            v={`${Math.round(solution.minRange)}–${Math.round(solution.maxRange)} m`}
          />
        </div>

        {oor && (
          <Warning>
            Range {Math.round(solution.rangeFlat)} m falls outside this charge's band
            ({Math.round(solution.minRange)}–{Math.round(solution.maxRange)} m).
            Switch charge or enable auto-select.
          </Warning>
        )}
        {tooLowAngle && !oor && (
          <Warning kind="info">
            Solution is on the low-angle (flat) end of this charge. Step up one
            charge for better arc / cover clearance.
          </Warning>
        )}
        {solution.interpolated && !oor && (
          <div className="text-[10px] text-muted">
            ◇ Values interpolated between table rows.
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" className="btn btn-primary flex-1" onClick={onSave}>
            Log Mission
          </button>
          <button type="button" className="btn flex-1" onClick={onMarkImpact}>
            Set as Impact
          </button>
        </div>
      </div>
    </Panel>
  );
}

function Stat({
  label,
  value,
  mono,
  big,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  big?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="border border-line p-2 bg-bg">
      <div className="stat-label">{label}</div>
      <div
        className={`tabular-nums ${mono ? 'font-mono' : ''} ${
          big ? 'text-2xl' : 'text-base'
        } ${highlight ? 'text-accent-glow' : 'text-accent'}`}
      >
        {value}
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 pb-1">
      <span className="text-muted text-[10px] uppercase tracking-wider">{k}</span>
      <span className="text-accent tabular-nums">{v}</span>
    </div>
  );
}

function Warning({
  children,
  kind = 'warn',
}: {
  children: React.ReactNode;
  kind?: 'warn' | 'info' | 'danger';
}) {
  const colors =
    kind === 'danger'
      ? 'border-danger/60 text-danger bg-danger/5'
      : kind === 'info'
      ? 'border-accent-dim/60 text-accent-glow bg-accent-dim/10'
      : 'border-warn/60 text-warn bg-warn/5';
  return (
    <div className={`border ${colors} px-2 py-1.5 text-[11px] leading-snug`}>
      {children}
    </div>
  );
}
