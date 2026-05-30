import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FiringSolution, Vec3 } from "../types";
import { correctedTarget, correctionDelta } from "../lib/ballistics";
import { InfoHint } from "./Tooltip";

type Props = {
  gun: Vec3 | null;
  target: Vec3 | null;
  solution: FiringSolution | null;
  onApplyCorrection: (corrected: Vec3) => void;
  isPremium: boolean;
  onOpenLicense: () => void;
};

export default function CorrectionPanel({ gun, target, solution, onApplyCorrection, isPremium, onOpenLicense }: Props) {
  const { t } = useTranslation();
  const [ix, setIx] = useState("");
  const [iy, setIy] = useState("");
  const [iz, setIz] = useState("");

  const impact: Vec3 | null =
    ix && iy ? { x: Number(ix), y: Number(iy), z: Number(iz || 0) } : null;

  const delta =
    gun && target && impact ? correctionDelta(gun, target, impact) : null;

  function apply() {
    if (!target || !impact) return;
    onApplyCorrection(correctedTarget(target, impact));
  }

  function clear() {
    setIx("");
    setIy("");
    setIz("");
  }

  return (
    <div className="panel p-3 space-y-3 relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-line/40 pb-1.5">
        <span className="section-title flex items-center gap-1.5">
          <span className="text-zinc-600">COR:</span>
          {t('correction.title').toUpperCase()}
          <InfoHint
            width={300}
            text={
              <>
                Enter the <b>observed impact point</b> (where the shell actually landed)
                and the panel will compute how far the round was over/short and
                left/right of the target. <b>Apply Correction</b> mirrors the miss to
                aim the next round on target.
              </>
            }
          />
        </span>
        {isPremium ? (
          <button
            className="btn !py-0.5 !px-2 !text-[9px] uppercase tracking-wider"
            onClick={clear}
            title="Clear impact fields."
            disabled={!ix && !iy && !iz}
          >
            {t('correction.clear')}
          </button>
        ) : (
          <span className="text-[9px] font-mono text-zinc-500 bg-black/40 px-1.5 py-0.5 rounded-sm border border-line/40 uppercase">🔒 Locked</span>
        )}
      </div>

      {!isPremium ? (
        <div className="bg-black/40 border border-line/30 p-4 rounded-sm text-center font-mono text-[9px] text-zinc-500 space-y-3 py-6 relative z-10 overflow-hidden">
          <div className="text-amber-400 font-semibold tracking-wider relative z-20 uppercase">{t('correction.locked')}</div>
          <p className="text-[8px] text-zinc-400 leading-relaxed px-2 relative z-20">
            {t('correction.lockedDesc')}
          </p>
          <button
            type="button"
            className="btn-primary !py-1.5 !px-4 !text-[9px] relative z-20"
            onClick={onOpenLicense}
          >
            {t('rightPanel.unlockPremium').toUpperCase()}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 pt-0.5">
            <div className="space-y-1">
              <div className="label text-[9px]">{t('correction.impactX')}</div>
              <input
                className="field !py-1.5 text-xs"
                value={ix}
                onChange={(e) => setIx(e.target.value)}
                placeholder="meters"
                title="World X of where the round actually impacted (in meters)."
              />
            </div>
            <div className="space-y-1">
              <div className="label text-[9px]">{t('correction.impactY')}</div>
              <input
                className="field !py-1.5 text-xs"
                value={iy}
                onChange={(e) => setIy(e.target.value)}
                placeholder="meters"
                title="World Y of where the round actually impacted (in meters)."
              />
            </div>
            <div className="space-y-1">
              <div className="label text-[9px]">{t('correction.impactZ')}</div>
              <input
                className="field !py-1.5 text-xs"
                value={iz}
                onChange={(e) => setIz(e.target.value)}
                placeholder="0"
                title="Impact altitude (optional)."
              />
            </div>
          </div>

          {delta ? (
            <div className="grid grid-cols-2 gap-2 pt-1 animate-fadeIn">
              <div
                className="panel-alt p-2.5 bg-black/20"
                title="Along the line of fire from gun to target. Positive = past the target; negative = short of it."
              >
                <div className="label !text-[8px]">// {t('correction.rangeDelta')}</div>
                <div className="font-mono text-xl text-accent mt-1 font-bold">
                  {delta.alongM >= 0 ? "+" : "−"}
                  {Math.abs(delta.alongM).toFixed(0)}<span className="text-[10px] ml-0.5 text-zinc-500 font-normal">m</span>
                </div>
                <div className="font-mono text-[8px] text-zinc-500 leading-tight mt-1 uppercase tracking-tighter">
                  {delta.alongM >= 0 ? "OVER target → drop" : "SHORT of target → add"}
                </div>
              </div>
              <div
                className="panel-alt p-2.5 bg-black/20"
                title="Perpendicular to the line of fire. Positive = right of target; negative = left of target."
              >
                <div className="label !text-[8px]">// {t('correction.lateralDelta')}</div>
                <div className="font-mono text-xl text-accent mt-1 font-bold">
                  {delta.crossM >= 0 ? "+" : "−"}
                  {Math.abs(delta.crossM).toFixed(0)}<span className="text-[10px] ml-0.5 text-zinc-500 font-normal">m</span>
                </div>
                <div className="font-mono text-[8px] text-zinc-500 leading-tight mt-1 uppercase tracking-tighter">
                  {delta.crossM >= 0 ? "RIGHT of target → shift left" : "LEFT of target → shift right"}
                </div>
              </div>
            </div>
          ) : (
            <div className="font-mono text-[10px] text-zinc-600 py-3 text-center border border-dashed border-line/20 rounded-sm">
              Enter observed impact point to compute correction.
            </div>
          )}

          <button
            className="btn-primary w-full !py-2 !text-[10px] shadow-[0_0_15px_rgba(214,255,58,0.05)]"
            onClick={apply}
            disabled={!delta || !solution}
            title="Mirror the observed miss across the target — the new target becomes target + (target − impact)."
          >
            {t('correction.apply').toUpperCase()}
          </button>
        </>
      )}
    </div>
  );
}
