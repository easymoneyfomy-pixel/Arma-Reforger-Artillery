import type { Weapon, Ammo } from "../types";
import CoordInput from "./CoordInput";
import { InfoHint } from "./Tooltip";

type Props = {
  weapons: Weapon[];
  weaponId: string;
  setWeaponId: (id: string) => void;
  ammoId: string;
  setAmmoId: (id: string) => void;
  chargeId: string;
  setChargeId: (id: string) => void;
  autoCharge: boolean;
  setAutoCharge: (v: boolean) => void;
  worldSizeM: number;
  gun: { x: string; y: string; z: string };
  setGun: (g: { x: string; y: string; z: string }) => void;
  target: { x: string; y: string; z: string };
  setTarget: (t: { x: string; y: string; z: string }) => void;
};

export default function LeftPanel(p: Props) {
  const weapon = p.weapons.find((w) => w.id === p.weaponId)!;
  const ammo = (weapon?.ammo.find((a) => a.id === p.ammoId) ?? weapon?.ammo[0]) as Ammo;
  const chargeBands = ammo?.charges.map((c) => ({
    id: c.id,
    label: c.label,
    min: c.rows[0].range_m,
    max: c.rows[c.rows.length - 1].range_m,
  }));

  return (
    <div className="space-y-3">
      <div className="panel p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="section-title">Fire Mission · Input</span>
          <span className="text-[10px] font-mono text-zinc-600">FDC-01</span>
        </div>
        <div>
          <div className="label mb-1 flex items-center">
            Weapon
            <InfoHint
              text={
                <>
                  Choose the artillery piece. <b>Vanilla</b> weapons exist in stock Arma
                  Reforger; <b>[mod]</b> weapons require a mod (e.g. WCS Artillery).
                  Each weapon has its own ballistics tables.
                </>
              }
            />
          </div>
          <select
            className="field"
            title="Select the artillery piece. Vanilla weapons exist in stock Arma Reforger; [mod] weapons require a community mod."
            value={p.weaponId}
            onChange={(e) => {
              p.setWeaponId(e.target.value);
              const w = p.weapons.find((w) => w.id === e.target.value);
              if (w) {
                p.setAmmoId(w.ammo[0].id);
                p.setChargeId(w.ammo[0].charges[0].id);
              }
            }}
          >
            {p.weapons.map((w) => (
              <option key={w.id} value={w.id}>
                {w.faction ? `[${w.faction}] ` : ""}
                {w.name}
                {w.isMod ? "  [mod]" : ""}
              </option>
            ))}
          </select>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            {weapon.category.toUpperCase()}
            {weapon.faction ? ` · ${weapon.faction}` : ""}
            {weapon.isMod ? " · MOD" : " · VANILLA"}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="label mb-1 flex items-center">
              Ammunition
              <InfoHint
                text={
                  <>
                    Projectile / fuze combination. Currently HE only. Different rounds
                    have different ballistics; pick the one loaded on the gun.
                  </>
                }
              />
            </div>
            <select
              className="field"
              title="Projectile/fuze loaded on the gun."
              value={p.ammoId}
              onChange={(e) => {
                p.setAmmoId(e.target.value);
                const a = weapon.ammo.find((a) => a.id === e.target.value);
                if (a) p.setChargeId(a.charges[0].id);
              }}
            >
              {weapon?.ammo.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label mb-1 flex items-center">
              Charge
              <InfoHint
                text={
                  <>
                    Powder increments. <b>Lower</b> charge = steeper arc, more accurate, shorter range.
                    <b> Higher</b> charge = flatter, longer range, longer time of flight.
                    <br />
                    <b>Auto</b> picks a charge that hits the target with a useful arc.
                  </>
                }
              />
              <label className="float-right normal-case tracking-normal text-[10px] text-zinc-400 flex items-center gap-1 ml-auto">
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={p.autoCharge}
                  onChange={(e) => p.setAutoCharge(e.target.checked)}
                  title="When on, the optimal charge is auto-selected for the current target range."
                />
                auto
              </label>
            </div>
            <select
              className="field"
              title="Powder charge. Lower = steeper arc, shorter range. Higher = flatter, longer range."
              value={p.chargeId}
              disabled={p.autoCharge}
              onChange={(e) => p.setChargeId(e.target.value)}
            >
              {ammo?.charges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} · {c.rows[0].range_m}-{c.rows[c.rows.length - 1].range_m}m
                </option>
              ))}
            </select>
          </div>
        </div>
        {chargeBands && (
          <div className="font-mono text-[10px] text-zinc-500 leading-snug">
            Available ranges:{" "}
            {chargeBands.map((b, i) => (
              <span key={b.id}>
                {i > 0 && " · "}
                <span className={b.id === p.chargeId ? "text-accent" : ""}>
                  C{b.id} {b.min}–{b.max}m
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      <CoordInput
        label="Gun Position"
        accent="gun"
        worldSizeM={p.worldSizeM}
        xValue={p.gun.x}
        yValue={p.gun.y}
        zValue={p.gun.z}
        onChange={p.setGun}
      />
      <CoordInput
        label="Target Position"
        accent="target"
        worldSizeM={p.worldSizeM}
        xValue={p.target.x}
        yValue={p.target.y}
        zValue={p.target.z}
        onChange={p.setTarget}
      />
    </div>
  );
}
