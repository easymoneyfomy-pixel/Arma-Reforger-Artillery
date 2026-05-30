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
};

export default function CorrectionPanel({ gun, target, solution, onApplyCorrection }: Props) {
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
    <div className="panel p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="section-title flex items-center">
          <span className="text-zinc-600 mr-1">COR:</span>{t('correction.title')}
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
        <button
          className="btn !py-0.5 !px-2 !text-[10px]"
          onClick={clear}
          title="Clear impact fields."
          disabled={!ix && !iy && !iz}
        >
          {t('correction.clear')}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="label mb-1">{t('correction.impactX')}</div>
          <input
            className="field"
            value={ix}
            onChange={(e) => setIx(e.target.value)}
            placeholder="meters"
            title="World X of where the round actually impacted (in meters)."
          />
        </div>
        <div>
          <div className="label mb-1">{t('correction.impactY')}</div>
          <input
            className="field"
            value={iy}
            onChange={(e) => setIy(e.target.value)}
            placeholder="meters"
            title="World Y of where the round actually impacted (in meters)."
          />
        </div>
        <div>
          <div className="label mb-1">{t('correction.impactZ')}</div>
          <input
            className="field"
            value={iz}
            onChange={(e) => setIz(e.target.value)}
            placeholder="0"
            title="Impact altitude (optional)."
          />
        </div>
      </div>

      {delta ? (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div
            className="panel-alt p-2"
            title="Along the line of fire from gun to target. Positive = past the target; negative = short of it."
          >
            <div className="label">// {t('correction.rangeDelta')}</div>
            <div className="font-mono text-lg text-accent mt-0.5">
              {delta.alongM >= 0 ? "+" : "−"}
              {Math.abs(delta.alongM).toFixed(0)} m
            </div>
            <div className="font-mono text-[9px] text-zinc-500 leading-tight">
              {delta.alongM >= 0 ? "OVER target → drop" : "SHORT of target → add"}
            </div>
          </div>
          <div
            className="panel-alt p-2"
            title="Perpendicular to the line of fire. Positive = right of target; negative = left of target."
          >
            <div className="label">// {t('correction.lateralDelta')}</div>
            <div className="font-mono text-lg text-accent mt-0.5">
              {delta.crossM >= 0 ? "+" : "−"}
              {Math.abs(delta.crossM).toFixed(0)} m
            </div>
            <div className="font-mono text-[9px] text-zinc-500 leading-tight">
              {delta.crossM >= 0 ? "RIGHT of target → shift left" : "LEFT of target → shift right"}
            </div>
          </div>
        </div>
      ) : (
        <div className="font-mono text-xs text-zinc-600 py-2">
          Enter observed impact point to compute correction.
        </div>
      )}

      <button
        className="btn-primary w-full"
        onClick={apply}
        disabled={!delta || !solution}
        title="Mirror the observed miss across the target — the new target becomes target + (target − impact)."
      >
        {t('correction.apply')}
      </button>
    </div>
  );
}
