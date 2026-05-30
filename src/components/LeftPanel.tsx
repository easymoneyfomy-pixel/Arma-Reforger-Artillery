import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  presets: Record<string, { x: number; y: number; z: number }>;
  onSelectPreset: (pos: { x: number; y: number; z: number }, type: "gun" | "target") => void;
  onSavePreset: (name: string, pos: { x: number; y: number; z: number }) => void;
  onDeletePreset: (name: string) => void;
  targetV: { x: number; y: number; z: number } | null;
  gunV: { x: number; y: number; z: number } | null;
  isPremium: boolean;
  onOpenLicense: () => void;
};

export default function LeftPanel(p: Props) {
  const { t } = useTranslation();
  const [newPresetName, setNewPresetName] = useState("");
  const [copiedExport, setCopiedExport] = useState(false);
  const [importMode, setImportMode] = useState(false);
  const [importVal, setImportVal] = useState("");
  const [importErr, setImportErr] = useState("");
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
          <span className="section-title"><span className="text-zinc-600 mr-1">SYS:</span>Fire Mission · Input</span>
          <span className="text-[10px] font-mono text-zinc-600">FDC-01</span>
        </div>
        <div>
          <div className="label mb-1 flex items-center">
            {t('leftPanel.weapon')}
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
              const w = p.weapons.find((w) => w.id === e.target.value);
              if (w) {
                if (w.isMod && !p.isPremium) {
                  p.onOpenLicense();
                  return;
                }
                p.setWeaponId(e.target.value);
                p.setAmmoId(w.ammo[0].id);
                p.setChargeId(w.ammo[0].charges[0].id);
              }
            }}
          >
            {p.weapons.map((w) => (
              <option key={w.id} value={w.id}>
                {w.faction ? `[${w.faction}] ` : ""}
                {w.name}
                {w.isMod ? `  ${p.isPremium ? "[mod]" : "🔒 [mod]"}` : ""}
              </option>
            ))}
          </select>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            {weapon.category.toUpperCase()}
            {weapon.faction ? ` · ${weapon.faction}` : ""}
            {weapon.isMod ? " · MOD" : " · VANILLA"}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <div className="label flex items-center">
              {t('leftPanel.ammo')}
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
              className="field !py-2"
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
          <div className="space-y-1">
            <div className="label flex items-center justify-between">
              <div className="flex items-center">
                {t('leftPanel.charge')}
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
              </div>
              <label className="normal-case tracking-normal text-[9px] text-zinc-500 flex items-center gap-1.5 cursor-pointer hover:text-zinc-300 transition-colors">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded-sm bg-black border-line checked:bg-accent focus:ring-0"
                  checked={p.autoCharge}
                  onChange={(e) => p.setAutoCharge(e.target.checked)}
                />
                <span className="font-mono uppercase">{t('leftPanel.autoCharge')}</span>
              </label>
            </div>
            <select
              className="field !py-2"
              title="Powder charge. Lower = steeper arc, shorter range. Higher = flatter, longer range."
              value={p.chargeId}
              disabled={p.autoCharge}
              onChange={(e) => p.setChargeId(e.target.value)}
            >
              {ammo?.charges.map((c) => (
                <option key={c.id} value={c.id}>
                  C{c.id} · {c.rows[0].range_m}-{c.rows[c.rows.length - 1].range_m}m
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
        label={t('leftPanel.gunPos')}
        accent="gun"
        worldSizeM={p.worldSizeM}
        xValue={p.gun.x}
        yValue={p.gun.y}
        zValue={p.gun.z}
        onChange={p.setGun}
      />
      <CoordInput
        label={t('leftPanel.targetPos')}
        accent="target"
        worldSizeM={p.worldSizeM}
        xValue={p.target.x}
        yValue={p.target.y}
        zValue={p.target.z}
        onChange={p.setTarget}
      />

      {/* Saved Landmarks Panel */}
      <div className="panel p-3 space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/40 pb-1.5">
          <span className="section-title flex items-center gap-1.5">
            <span className="text-zinc-600">MEM:</span>
            TACTICAL LANDMARKS
          </span>
          {p.isPremium ? (
             <span className="text-[9px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-sm border border-amber-400/20">👑 PREMIUM</span>
          ) : (
             <span className="text-[9px] font-mono text-zinc-500 bg-black/40 px-1.5 py-0.5 rounded-sm border border-line/40">🔒 LOCKED</span>
          )}
        </div>

        {!p.isPremium ? (
          <div className="bg-black/40 border border-line/30 p-4 rounded-sm text-center font-mono text-[10px] text-zinc-500 space-y-3 py-8 relative z-10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-amber-500/5 pointer-events-none"></div>
            <div className="text-amber-400 font-semibold tracking-wider relative z-20">TACTICAL MEMORY OFFLINE</div>
            <p className="text-[9px] text-zinc-400 leading-relaxed px-2 relative z-20">
              Unlock the ability to save, export and sync tactical landmarks across sessions.
            </p>
            <button
              type="button"
              className="btn-primary !py-2 !px-4 !text-[10px] relative z-20"
              onClick={p.onOpenLicense}
            >
              ACTIVATE FDC LICENSE
            </button>
          </div>
        ) : (
          <>
            {Object.keys(p.presets).length === 0 ? (
              <div className="text-[10px] text-zinc-500 font-mono py-2 text-center">
                No saved landmarks.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 border border-line/30 bg-black/10 p-1.5 rounded-sm">
                {Object.entries(p.presets).map(([name, pos]) => {
                  const kmX = (pos.x / 1000).toFixed(2);
                  const kmY = (pos.y / 1000).toFixed(2);
                  return (
                    <div key={name} className="flex items-center justify-between gap-1.5 p-1 border border-line/40 bg-panelAlt/30 text-[10px] font-mono hover:border-accent/40 rounded-sm">
                      <div className="truncate flex-1" title={name}>
                        <span className="text-accent font-bold">{name}</span>
                        <span className="text-zinc-500 ml-1">({kmX}, {kmY}, {pos.z}m)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="px-1 border border-emerald-500/40 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/50 rounded-sm text-[9px]"
                          onClick={() => p.onSelectPreset(pos, "gun")}
                          title="Set as Gun Position"
                        >
                          G
                        </button>
                        <button
                          className="px-1 border border-red-500/40 text-red-400 bg-red-950/20 hover:bg-red-950/50 rounded-sm text-[9px]"
                          onClick={() => p.onSelectPreset(pos, "target")}
                          title="Set as Target Position"
                        >
                          T
                        </button>
                        <button
                          className="px-1 border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500/40 rounded-sm text-[9px]"
                          onClick={() => p.onDeletePreset(name)}
                          title="Delete Preset"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Preset Form */}
            <div className="pt-1 space-y-2">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="LANDMARK_NAME"
                  className="field flex-1 text-[10px] font-mono uppercase"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                />
                <button
                  className="btn-primary !py-1 !px-2 !text-[9px] whitespace-nowrap"
                  disabled={!p.targetV || !newPresetName.trim()}
                  onClick={() => {
                    if (p.targetV && newPresetName.trim()) {
                      p.onSavePreset(newPresetName.trim(), p.targetV);
                      setNewPresetName("");
                    }
                  }}
                  title="Save current target coordinates as preset landmark."
                >
                  {t('leftPanel.savePreset').toUpperCase()}
                </button>
              </div>
              
              <div className="flex gap-1.5">
                <button
                  className={`flex-1 btn !py-1 !text-[9px] font-mono ${copiedExport ? "text-accent border-accent/40 bg-accentDim/10" : ""}`}
                  onClick={async () => {
                    try {
                      const dataStr = JSON.stringify(p.presets, null, 2);
                      await navigator.clipboard.writeText(dataStr);
                      setCopiedExport(true);
                      setTimeout(() => setCopiedExport(false), 2000);
                    } catch (e) {
                      // fallback
                    }
                  }}
                  disabled={Object.keys(p.presets).length === 0}
                  title="Copy all saved landmarks to clipboard as a JSON file to share."
                >
                  {copiedExport ? "COPIED LANDMARKS!" : "📤 EXPORT LANDMARKS"}
                </button>
                <button
                  className={`flex-1 btn !py-1 !text-[9px] font-mono ${importMode ? "text-accent border-accent/40 bg-accentDim/10" : ""}`}
                  onClick={() => {
                    setImportMode(!importMode);
                    setImportErr("");
                  }}
                  title="Import saved landmarks JSON from your clipboard."
                >
                  📥 IMPORT
                </button>
              </div>

              {importMode && (
                <div className="border border-line/30 bg-black/25 p-2 rounded-sm space-y-1.5 animate-fadeIn">
                  <textarea
                    placeholder='Paste landmarks JSON here... (e.g. {"everon_airport": {"x": 1400, "y": 11000, "z": 120}})'
                    className="field w-full h-14 text-[9px] font-mono p-1 bg-black/40 border-line/40 rounded-sm resize-none"
                    value={importVal}
                    onChange={(e) => setImportVal(e.target.value)}
                  />
                  {importErr && (
                    <div className="text-[9px] text-red-400 font-mono">
                      ⚠️ ERROR: {importErr}
                    </div>
                  )}
                  <div className="flex gap-1.5 justify-end">
                    <button
                      className="btn !py-0.5 !px-2 !text-[9px] border-zinc-700 text-zinc-400"
                      onClick={() => {
                        setImportMode(false);
                        setImportErr("");
                      }}
                    >
                      CANCEL
                    </button>
                    <button
                      className="btn-primary !py-0.5 !px-2 !text-[9px]"
                      onClick={() => {
                        try {
                          setImportErr("");
                          if (!importVal.trim()) {
                            setImportErr("DATA IS EMPTY");
                            return;
                          }
                          const parsed = JSON.parse(importVal);
                          if (typeof parsed !== "object" || parsed === null) {
                            setImportErr("INVALID FORMAT (MUST BE OBJECT)");
                            return;
                          }
                          let count = 0;
                          for (const [key, val] of Object.entries(parsed)) {
                            const name = key.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "_");
                            if (!name) continue;
                            const pos = val as any;
                            if (pos && typeof pos.x === "number" && typeof pos.y === "number" && typeof pos.z === "number") {
                              p.onSavePreset(name, { x: pos.x, y: pos.y, z: pos.z });
                              count++;
                            }
                          }
                          if (count === 0) {
                            setImportErr("NO VALID LANDMARKS FOUND");
                          } else {
                            setImportVal("");
                            setImportMode(false);
                          }
                        } catch (err: any) {
                          setImportErr(`JSON ERROR: ${err.message.substring(0, 20).toUpperCase()}`);
                        }
                      }}
                    >
                      LOAD
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
