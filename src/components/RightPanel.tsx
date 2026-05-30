import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { FiringSolution, Vec3 } from "../types";
import { InfoHint, Tooltip } from "./Tooltip";
import { generateShareUrl } from "../utils/share";

type Props = {
  solution: FiringSolution | null;
  onSave: () => void;
  soundEnabled: boolean;
  isPremium: boolean;
  onOpenLicense: () => void;
  gun: Vec3 | null;
  target: Vec3 | null;
  mapId: string;
};

export default function RightPanel({
  solution,
  onSave,
  soundEnabled,
  isPremium,
  onOpenLicense,
  gun,
  target,
  mapId,
}: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  // --- Mission Impact Timer States ---
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerTotal, setTimerTotal] = useState(0);

  // --- Wind States ---
  const [showWind, setShowWind] = useState(false);
  const [windSpeed, setWindSpeed] = useState("");
  const [windDir, setWindDir] = useState("");

  useEffect(() => {
    let interval: any;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 0.1));
      }, 100);
    } else if (timeLeft === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  async function copySolution() {
    if (!solution) return;
    try {
      await navigator.clipboard.writeText(formatSolutionText(solution));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  }

  async function copyShareUrl() {
    if (!solution || !gun || !target) return;
    const url = generateShareUrl(
      solution.weaponId,
      solution.ammoId,
      solution.chargeId,
      gun,
      target,
      mapId
    );
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1200);
    } catch {}
  }

  return (
    <div className="space-y-3">
      <div className="panel p-3 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="section-title flex items-center">
              <span className="text-zinc-600 mr-1">FDC:</span>{t('rightPanel.solution')}
              <InfoHint
                width={280}
                text={
                  <>
                    Computed firing data from the selected ballistic table.
                    Set <b>Azimuth</b> (compass) and <b>Elevation</b> (mils) on the gun.
                    Time of Flight is the projectile travel time after firing.
                  </>
                }
              />
            </span>
            {solution ? (
              <div className="flex items-center gap-1.5 px-1.5 py-0.5 border border-accentDim bg-accentDim/10 text-[8px] text-accent animate-pulse font-mono tracking-widest rounded-sm">
                {t('rightPanel.online')}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-1.5 py-0.5 border border-line bg-panelAlt/50 text-[8px] text-zinc-500 font-mono tracking-widest rounded-sm">
                {t('rightPanel.standby')}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Tooltip
              side="left"
              content="Generate a shareable URL for this mission."
            >
              <button
                className="btn !py-1 !px-2 !text-[10px]"
                onClick={copyShareUrl}
                disabled={!solution || !gun || !target}
              >
                {shared ? t('rightPanel.shared') : t('rightPanel.share')}
              </button>
            </Tooltip>
            <Tooltip
              side="left"
              content="Copy the firing solution as plain text (radio-comms format) to your clipboard."
            >
              <button
                className="btn !py-1 !px-2 !text-[10px]"
                onClick={copySolution}
                disabled={!solution}
              >
                {copied ? t('rightPanel.copied') : t('rightPanel.copy')}
              </button>
            </Tooltip>
            <Tooltip
              side="left"
              content="Save this fire mission to local history. Use the Combat Memory panel to reload it later."
            >
              <button className="btn-primary" onClick={onSave} disabled={!solution}>
                {t('rightPanel.saveMission')}
              </button>
            </Tooltip>
          </div>
        </div>

        {!solution ? (
          <div className="font-mono text-xs text-zinc-500 py-6 text-center border border-dashed border-line/30 rounded-sm">
            Enter coordinates to compute solution.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Stat
              label={t('rightPanel.range')}
              value={solution.rangeM.toFixed(0)}
              unit="m"
            />
            <Stat
              label={t('rightPanel.tof')}
              value={solution.tofSec.toFixed(1)}
              unit="s"
            />
            <Stat
              label={t('rightPanel.azimuth')}
              value={solution.bearingMil.toFixed(0)}
              unit="mil"
            />
            <Stat
              label={t('rightPanel.azimuth')}
              value={solution.bearingDeg.toFixed(1)}
              unit="°"
            />
            <Stat
              label={t('rightPanel.elevation')}
              value={solution.elevationMil.toFixed(0)}
              unit="mil"
            />
            <Stat
              label={t('rightPanel.charge')}
              value={solution.chargeLabel.replace("Charge ", "C")}
            />
          </div>
        )}
        {solution && (
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px] text-zinc-400">
            <div className="border border-line bg-black/30 px-2 py-1 flex items-center justify-between">
              <span className="label !text-[9px]">{t('rightPanel.arc')}</span>
              <span className={solution.arc === "high" ? "text-accent" : "text-amber-400"}>
                {solution.arc.toUpperCase()}
              </span>
            </div>
            <div className="border border-line bg-black/30 px-2 py-1 flex items-center justify-between">
              <span className="label !text-[9px]">{t('rightPanel.altDelta')}</span>
              <span className={Math.abs(solution.altDeltaM) >= 25 ? "text-danger" : "text-zinc-300"}>
                {solution.altDeltaM >= 0 ? "+" : "−"}{Math.abs(solution.altDeltaM).toFixed(0)} m
              </span>
            </div>
          </div>
        )}
      </div>

      {solution && (
        <div className="panel p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="section-title"><span className="text-zinc-600 mr-1">TMR:</span>{t('rightPanel.timer')}</span>
            <span className="text-[10px] font-mono text-accent">TOF {solution.tofSec.toFixed(1)}s</span>
          </div>

          <div className="panel-alt p-3 flex flex-col items-center justify-center space-y-2 relative overflow-hidden">
            <div className="font-mono text-3xl font-bold tracking-widest text-accent tabular-nums flex items-baseline gap-1">
              {timeLeft > 0 ? (
                <>
                  <span className="text-red-400 animate-pulse mr-1">{t('rightPanel.tMinus')}</span>
                  <span>{timeLeft.toFixed(1)}</span>
                  <span className="text-xs text-zinc-500">s</span>
                </>
              ) : timeLeft === 0 && timerTotal > 0 ? (
                <span className="text-emerald-400 font-bold tracking-wide animate-ping">{t('rightPanel.impact')}</span>
              ) : (
                <span className="text-zinc-500">{t('rightPanel.standby')}</span>
              )}
            </div>

            <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-line/30">
              <div
                className={`h-full transition-all duration-75 ${timeLeft <= 3 ? "bg-red-400 animate-pulse" : "bg-accent"}`}
                style={{ width: `${timerTotal > 0 ? (timeLeft / timerTotal) * 100 : 0}%` }}
              />
            </div>

            <div className="flex gap-2 w-full pt-1">
              <button
                className={`flex-1 btn font-mono !py-1 text-[10px] ${timerActive ? "border-amber-500/40 text-amber-400" : "btn-primary"}`}
                onClick={() => {
                  if (timerActive) setTimerActive(false);
                  else {
                    if (timeLeft <= 0) { setTimeLeft(solution.tofSec); setTimerTotal(solution.tofSec); }
                    setTimerActive(true);
                  }
                }}
              >
                {timerActive ? `⏸️ ${t('rightPanel.pause')}` : timeLeft > 0 ? `▶️ ${t('rightPanel.resume')}` : `⏱️ ${t('rightPanel.startTimer')}`}
              </button>
              <button
                className="btn font-mono !py-1 !px-3 text-[10px]"
                disabled={timeLeft <= 0 && !timerActive}
                onClick={() => { setTimerActive(false); setTimeLeft(0); setTimerTotal(0); }}
              >
                {t('rightPanel.reset')}
              </button>
            </div>
          </div>
        </div>
      )}

      {solution && (
        <div className="panel p-3 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-line/45 pb-1">
            <span className="section-title">
              <span className="text-zinc-600 mr-1">MET:</span>{t('rightPanel.wind')}
            </span>
            <span className="text-[10px] text-zinc-500">PREMIUM</span>
          </div>

          {!isPremium ? (
            <div className="bg-black/30 border border-line/20 p-3.5 rounded-sm text-center font-mono text-[9px] text-zinc-500 space-y-2 relative z-10 py-5">
              <div className="text-amber-400 font-semibold uppercase tracking-wider">🔒 {t('rightPanel.windLocked')}</div>
              <p className="text-[8px] text-zinc-400 leading-relaxed px-1">{t('rightPanel.windLockedDesc')}</p>
              <button type="button" className="btn border-accentDim/40 hover:bg-accentDim/10 text-accent text-[9px] px-3 py-1 uppercase tracking-wider" onClick={onOpenLicense}>
                {t('rightPanel.unlockPremium')}
              </button>
            </div>
          ) : (
            <>
              <button className="w-full flex items-center justify-between font-mono pt-1" onClick={() => setShowWind(!showWind)}>
                <span className="text-[10px] text-zinc-500 hover:text-accent">
                  {showWind ? t('rightPanel.collapseWind') + " ▲" : t('rightPanel.expandWind') + " ▼"}
                </span>
              </button>
              {showWind && (
                <div className="space-y-2.5 pt-1 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="label !text-[8px]">{t('rightPanel.windSpeed')}</span>
                      <input type="number" step="0.5" className="field w-full font-mono text-xs text-accent" value={windSpeed} onChange={(e) => setWindSpeed(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="label !text-[8px]">{t('rightPanel.windDir')}</span>
                      <input type="number" step="1" className="field w-full font-mono text-xs text-accent" value={windDir} onChange={(e) => setWindDir(e.target.value)} />
                    </div>
                  </div>
                  {/* ... (wind calc logic) */}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {solution && solution.warnings.length > 0 && (
        <div className="panel border-danger/40 p-3 space-y-1">
          <div className="section-title text-danger flex items-center">
            // {t('rightPanel.warnings')}
          </div>
          {solution.warnings.map((w, i) => (
            <div key={i} className="font-mono text-xs text-danger/90">· {w}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, unit, hint }: { label: string; value: string; unit?: string; hint?: string }) {
  return (
    <div className="panel-alt p-2 relative group" title={hint}>
      <div className="label mb-0.5">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-xl text-accent font-bold tracking-tight">{value}</span>
        {unit && <span className="text-[10px] text-zinc-500 font-mono">{unit}</span>}
      </div>
    </div>
  );
}

function formatSolutionText(s: FiringSolution): string {
  return [
    "FIRE MISSION",
    `WPN  ${s.weaponId.toUpperCase()}  AMMO ${s.ammoId.toUpperCase()}  ${s.chargeLabel.toUpperCase()}`,
    `AZ   ${s.bearingMil.toFixed(0)} mil  (${s.bearingDeg.toFixed(1)} deg)`,
    `EL   ${s.elevationMil.toFixed(0)} mil`,
    `TOF  ${s.tofSec.toFixed(1)} s`,
    `DIST ${s.rangeM.toFixed(0)} m`,
  ].join("\n");
}
