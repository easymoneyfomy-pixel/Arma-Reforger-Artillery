import { useMemo } from 'react';
import { Panel } from './Panel';
import { GridInput } from './GridInput';
import { correctedAimpoint, spotterDelta, solveFireMission } from '../lib/solver';
import { fmtMil, formatGrid } from '../lib/coordinates';
import type { Point3D } from '../types';

interface Props {
  weaponId: string;
  ammoId: string;
  chargeId: string | null;
  autoCharge: boolean;
  gun: Point3D;
  target: Point3D;
  impact: Point3D | null;
  onImpactChange: (p: Point3D | null) => void;
  onApplyCorrection: (newTarget: Point3D) => void;
}

export function SpotterCorrection(props: Props) {
  const impact = props.impact;

  const delta = useMemo(() => {
    if (!impact) return null;
    return spotterDelta(props.gun, props.target, impact);
  }, [impact, props.gun, props.target]);

  const correctedSolution = useMemo(() => {
    if (!impact) return null;
    const corrected = correctedAimpoint(props.target, impact);
    const res = solveFireMission({
      weaponId: props.weaponId,
      ammoId: props.ammoId,
      chargeId: props.autoCharge ? null : props.chargeId,
      gun: props.gun,
      target: corrected,
    });
    return { corrected, ...res };
  }, [impact, props.target, props.gun, props.weaponId, props.ammoId, props.chargeId, props.autoCharge]);

  return (
    <Panel
      title="Spotter Correction"
      right={
        impact && (
          <button
            type="button"
            className="btn !px-2 !py-0.5 btn-danger"
            onClick={() => props.onImpactChange(null)}
          >
            Clear
          </button>
        )
      }
    >
      <div className="space-y-3">
        <p className="text-[10px] text-muted leading-snug">
          Enter where the round actually landed. The system will compute
          ADD/DROP and LEFT/RIGHT relative to the gun-target line, plus a new
          fire solution against the mirrored aimpoint.
        </p>

        <GridInput
          label="Impact"
          value={impact ?? { x: 0, y: 0 }}
          onChange={(p) =>
            props.onImpactChange({ x: p.x, y: p.y, z: impact?.z ?? props.target.z })
          }
        />
        <div>
          <label className="field-label">Impact altitude (m)</label>
          <input
            className="field-input"
            inputMode="numeric"
            value={impact?.z ?? props.target.z}
            onChange={(e) =>
              props.onImpactChange({
                x: impact?.x ?? 0,
                y: impact?.y ?? 0,
                z: Number(e.target.value) || 0,
              })
            }
          />
        </div>

        {impact && delta && (
          <>
            <div className="divider-h" />
            <div className="grid grid-cols-2 gap-2">
              <DeltaBox label={delta.add_m >= 0 ? 'ADD' : 'DROP'} value={`${Math.abs(delta.add_m).toFixed(0)} m`} />
              <DeltaBox label={delta.right_m >= 0 ? 'RIGHT' : 'LEFT'} value={`${Math.abs(delta.right_m).toFixed(0)} m`} />
              <DeltaBox label="UP/DN" value={`${delta.up_m >= 0 ? '+' : ''}${delta.up_m.toFixed(0)} m`} small />
              <DeltaBox label="MISS" value={`${delta.totalMiss_m.toFixed(0)} m`} small />
            </div>

            {correctedSolution?.solution && (
              <div className="border border-accent-dim/50 bg-accent-dim/10 p-2 space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-accent-glow">
                  Corrected Aimpoint
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs tabular-nums">
                  <Kv k="Aim" v={formatGrid(correctedSolution.corrected, 4)} />
                  <Kv k="Charge" v={correctedSolution.solution.chargeId} />
                  <Kv k="AZ" v={`${fmtMil(correctedSolution.solution.bearingMils)} mil`} />
                  <Kv k="EL" v={`${fmtMil(correctedSolution.solution.elevationMils)} mil`} />
                </div>
                <button
                  type="button"
                  className="btn btn-primary w-full !text-[11px]"
                  onClick={() => props.onApplyCorrection(correctedSolution.corrected)}
                >
                  Apply Correction → Target
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}

function DeltaBox({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="border border-line bg-bg p-2">
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className={`tabular-nums text-accent-glow ${small ? 'text-base' : 'text-xl'}`}>{value}</div>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{k}</span>
      <span className="text-accent">{v}</span>
    </div>
  );
}
