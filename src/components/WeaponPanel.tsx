import { Panel } from './Panel';
import { GridInput } from './GridInput';
import { WEAPONS } from '../lib/weapons';
import { ammoRangeBand } from '../lib/ballistics';
import type { Point3D, WeaponData } from '../types';

interface Props {
  weaponId: string;
  ammoId: string;
  chargeId: string | null;
  autoCharge: boolean;
  gun: Point3D;
  target: Point3D;
  onChange: (next: Partial<{
    weaponId: string;
    ammoId: string;
    chargeId: string | null;
    autoCharge: boolean;
    gun: Point3D;
    target: Point3D;
  }>) => void;
}

export function WeaponPanel(props: Props) {
  const weapon = WEAPONS.find((w) => w.id === props.weaponId) ?? WEAPONS[0];
  const ammo = weapon.ammo.find((a) => a.id === props.ammoId) ?? weapon.ammo[0];
  const charges = ammo.charges;
  const band = ammoRangeBand(ammo);

  function selectWeapon(id: string) {
    const w = WEAPONS.find((x) => x.id === id)!;
    const a = w.ammo[0];
    props.onChange({
      weaponId: id,
      ammoId: a.id,
      chargeId: null,
    });
  }
  function selectAmmo(id: string) {
    const a = weapon.ammo.find((x) => x.id === id)!;
    props.onChange({ ammoId: id, chargeId: null });
    void a;
  }

  return (
    <div className="space-y-3">
      <Panel
        title="Weapon System"
        right={<SourceTag weapon={weapon} />}
      >
        <div className="space-y-3">
          <div>
            <label className="field-label">Tube</label>
            <select
              className="field-input"
              value={weapon.id}
              onChange={(e) => selectWeapon(e.target.value)}
            >
              {WEAPONS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} · {w.faction ?? '—'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Ammunition</label>
            <select
              className="field-input"
              value={ammo.id}
              onChange={(e) => selectAmmo(e.target.value)}
            >
              {weapon.ammo.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.category}
                </option>
              ))}
            </select>
            <div className="text-[10px] text-muted mt-1">
              Effective band: {band.min}–{band.max} m
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="field-label !mb-0">Charge</label>
              <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-accent-dim"
                  checked={props.autoCharge}
                  onChange={(e) => props.onChange({ autoCharge: e.target.checked })}
                />
                Auto-select
              </label>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {charges.map((c) => {
                const isActive = !props.autoCharge && props.chargeId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={props.autoCharge}
                    onClick={() => props.onChange({ chargeId: c.id, autoCharge: false })}
                    className={`btn !px-1 !py-1 text-center ${
                      isActive ? 'btn-primary' : ''
                    } ${props.autoCharge ? 'opacity-50' : ''}`}
                    title={`${c.label} · ${c.table[0][0]}–${c.table[c.table.length - 1][0]} m`}
                  >
                    {c.id}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Gun Position">
        <GridInput
          label="Grid"
          value={props.gun}
          onChange={(p) => props.onChange({ gun: { x: p.x, y: p.y, z: props.gun.z } })}
        />
        <div className="mt-2">
          <label className="field-label">Altitude (m)</label>
          <input
            className="field-input"
            inputMode="numeric"
            value={props.gun.z}
            onChange={(e) =>
              props.onChange({
                gun: { ...props.gun, z: Number(e.target.value) || 0 },
              })
            }
          />
        </div>
      </Panel>

      <Panel title="Target">
        <GridInput
          label="Grid"
          value={props.target}
          onChange={(p) =>
            props.onChange({ target: { x: p.x, y: p.y, z: props.target.z } })
          }
        />
        <div className="mt-2">
          <label className="field-label">Altitude (m)</label>
          <input
            className="field-input"
            inputMode="numeric"
            value={props.target.z}
            onChange={(e) =>
              props.onChange({
                target: { ...props.target, z: Number(e.target.value) || 0 },
              })
            }
          />
        </div>
      </Panel>
    </div>
  );
}

function SourceTag({ weapon }: { weapon: WeaponData }) {
  return (
    <span
      className={`chip ${weapon.source === 'mod' ? 'chip-on' : ''}`}
      title={weapon.source === 'mod' ? 'Modded weapon' : 'Base game'}
    >
      {weapon.source.toUpperCase()}
    </span>
  );
}
