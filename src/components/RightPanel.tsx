import { useState, useEffect } from "react";
import type { FiringSolution } from "../types";
import { InfoHint, Tooltip } from "./Tooltip";

type Props = {
  solution: FiringSolution | null;
  onSave: () => void;
  soundEnabled: boolean;
};

function formatSolutionText(s: FiringSolution): string {
  return [
    "FIRE MISSION",
    `WPN  ${s.weaponId.toUpperCase()}  AMMO ${s.ammoId.toUpperCase()}  ${s.chargeLabel.toUpperCase()}`,
    `AZ   ${s.bearingMil.toFixed(0)} mil  (${s.bearingDeg.toFixed(1)} deg)`,
    `ELEV ${s.elevationMil.toFixed(0)} mil`,
    `RNG  ${s.rangeM.toFixed(0)} m`,
    `TOF  ${s.tofSec.toFixed(1)} s`,
    `ARC  ${s.arc.toUpperCase()}   ALT ${s.altDeltaM >= 0 ? "+" : "-"}${Math.abs(s.altDeltaM).toFixed(0)} m`,
  ].join("\n");
}

function Stat({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: React.ReactNode;
}) {
  return (
    <div className="panel-alt p-3 flex flex-col gap-1" title={typeof hint === "string" ? hint : undefined}>
      <span className="label flex items-center">
        {label}
        {hint && <InfoHint side="top" text={hint} />}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-3xl text-accent tabular-nums">{value}</span>
        {unit && <span className="font-mono text-xs text-zinc-500">{unit}</span>}
      </div>
    </div>
  );
}

export default function RightPanel({ solution, onSave, soundEnabled }: Props) {
  const [copied, setCopied] = useState(false);

  // --- Mission Impact Timer States ---
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerTotal, setTimerTotal] = useState(0);

  // --- Wind Correction States ---
  const [showWind, setShowWind] = useState(false);
  const [windSpeed, setWindSpeed] = useState("");
  const [windDir, setWindDir] = useState("");

  // Reset timer on solution change
  useEffect(() => {
    setTimerActive(false);
    setTimeLeft(0);
    setTimerTotal(0);
  }, [solution]);

  // Precise countdown tick listener
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) {
      if (timerActive && timeLeft <= 0) {
        setTimerActive(false);
        playImpactAlarm();
      }
      return;
    }

    const start = Date.now();
    const initialTime = timeLeft;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const nextTime = Math.max(0, initialTime - elapsed);
      setTimeLeft(nextTime);

      if (soundEnabled && nextTime > 0) {
        const ceilCur = Math.ceil(nextTime);
        const ceilPrev = Math.ceil(timeLeft);
        if (ceilCur !== ceilPrev && ceilCur <= 3) {
          playTickSound(ceilCur);
        }
      }

      if (nextTime <= 0) {
        clearInterval(interval);
        setTimerActive(false);
        playImpactAlarm();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [timerActive, timeLeft, soundEnabled]);

  function playTickSound(tickNum: number) {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const freq = 600 + (3 - tickNum) * 100;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  }

  function playImpactAlarm() {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    try {
      const ctx = new AudioContext();
      const playBeep = (timeOffset: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(freq, ctx.currentTime + timeOffset);
        gain.gain.setValueAtTime(0.03, ctx.currentTime + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + 0.18);
        
        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.18);
      };

      playBeep(0, 880);
      playBeep(0.12, 1046);
    } catch (e) {}
  }

  async function copySolution() {
    if (!solution) return;
    try {
      await navigator.clipboard.writeText(formatSolutionText(solution));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked — silently ignore */
    }
  }

  return (
    <div className="space-y-3">
      <div className="panel p-3">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2">
            <span className="section-title flex items-center">
              <span className="text-zinc-600 mr-1">FDC:</span>Firing Solution
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
                ONLINE
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-1.5 py-0.5 border border-line bg-panelAlt/50 text-[8px] text-zinc-500 font-mono tracking-widest rounded-sm">
                STANDBY
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Tooltip
              side="left"
              content="Copy the firing solution as plain text (radio-comms format) to your clipboard."
            >
              <button
                className="btn !py-1 !px-2 !text-[10px]"
                onClick={copySolution}
                disabled={!solution}
                title="Copy solution as text"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </Tooltip>
            <Tooltip
              side="left"
              content="Save this fire mission to local history. Use the Combat Memory panel to reload it later."
            >
              <button className="btn-primary" onClick={onSave} disabled={!solution}>
                Save Mission
              </button>
            </Tooltip>
          </div>
        </div>

        {!solution ? (
          <div className="font-mono text-xs text-zinc-500 py-6 text-center">
            Enter gun and target coordinates to compute solution.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Stat
              label="Range"
              value={solution.rangeM.toFixed(0)}
              unit="m"
              hint="Ground (2D) distance from gun to target."
            />
            <Stat
              label="Time of Flight"
              value={solution.tofSec.toFixed(1)}
              unit="s"
              hint="Seconds from firing to impact."
            />
            <Stat
              label="Azimuth"
              value={solution.bearingMil.toFixed(0)}
              unit="mil"
              hint="Direction to target in NATO mils (6400 / circle), measured clockwise from North."
            />
            <Stat
              label="Azimuth"
              value={solution.bearingDeg.toFixed(1)}
              unit="°"
              hint="Direction to target in degrees, clockwise from North."
            />
            <Stat
              label="Elevation"
              value={solution.elevationMil.toFixed(0)}
              unit="mil"
              hint="Tube elevation in mils. Match this on the gun's elevation indicator."
            />
            <Stat
              label="Charge"
              value={solution.chargeLabel.replace("Charge ", "C")}
              hint="Powder charge to load. C0 = bag only; higher numbers add increments."
            />
          </div>
        )}
        {solution && (
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px] text-zinc-400">
            <div
              className="border border-line bg-black/30 px-2 py-1 flex items-center justify-between"
              title="High arc (≥800 mil ≈ 45°) is mortar-style indirect fire; low arc is flatter and faster."
            >
              <span className="label !text-[9px]">Arc</span>
              <span
                className={
                  solution.arc === "high"
                    ? "text-accent"
                    : solution.arc === "low"
                      ? "text-amber-400"
                      : "text-danger"
                }
              >
                {solution.arc.toUpperCase()}
              </span>
            </div>
            <div
              className="border border-line bg-black/30 px-2 py-1 flex items-center justify-between"
              title="Target altitude minus gun altitude. Tables assume level terrain — large deltas reduce accuracy."
            >
              <span className="label !text-[9px]">Δ Alt</span>
              <span className={Math.abs(solution.altDeltaM) >= 25 ? "text-danger" : "text-zinc-300"}>
                {solution.altDeltaM >= 0 ? "+" : "−"}
                {Math.abs(solution.altDeltaM).toFixed(0)} m
              </span>
            </div>
          </div>
        )}
      </div>

      {/* --- Mission Impact Timer Panel --- */}
      {solution && (
        <div className="panel p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="section-title"><span className="text-zinc-600 mr-1">TMR:</span>Impact Countdown</span>
            <span className="text-[10px] font-mono text-accent">TOF {solution.tofSec.toFixed(1)}s</span>
          </div>

          <div className="panel-alt p-3 flex flex-col items-center justify-center space-y-2 relative overflow-hidden">
            {timerActive && (
              <div className="absolute inset-0 bg-accentDim/5 animate-pulse pointer-events-none" />
            )}

            <div className="font-mono text-3xl font-bold tracking-widest text-accent tabular-nums flex items-baseline gap-1">
              {timeLeft > 0 ? (
                <>
                  <span className="text-red-400 animate-pulse mr-1">T-MINUS:</span>
                  <span>{timeLeft.toFixed(1)}</span>
                  <span className="text-xs text-zinc-500">s</span>
                </>
              ) : timeLeft === 0 && timerTotal > 0 ? (
                <span className="text-emerald-400 font-bold tracking-wide animate-ping">IMPACT!</span>
              ) : (
                <span className="text-zinc-500">STANDBY</span>
              )}
            </div>

            <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-line/30">
              <div
                className={`h-full transition-all duration-75 ${timeLeft <= 3 ? "bg-red-400 animate-pulse" : "bg-accent"}`}
                style={{
                  width: `${timerTotal > 0 ? (timeLeft / timerTotal) * 100 : 0}%`,
                }}
              />
            </div>

            <div className="flex gap-2 w-full pt-1">
              <button
                className={`flex-1 btn font-mono !py-1 text-[10px] ${timerActive ? "border-amber-500/40 text-amber-400" : "btn-primary"}`}
                onClick={() => {
                  if (timerActive) {
                    setTimerActive(false);
                  } else {
                    if (timeLeft <= 0) {
                      setTimeLeft(solution.tofSec);
                      setTimerTotal(solution.tofSec);
                    }
                    setTimerActive(true);
                  }
                }}
              >
                {timerActive ? "⏸️ PAUSE" : timeLeft > 0 && timeLeft < solution.tofSec ? "▶️ RESUME" : "⏱️ START COUNTDOWN"}
              </button>
              <button
                className="btn font-mono !py-1 !px-3 text-[10px]"
                disabled={timeLeft <= 0 && !timerActive}
                onClick={() => {
                  setTimerActive(false);
                  setTimeLeft(0);
                  setTimerTotal(0);
                }}
              >
                RESET
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MET: Wind Correction Tool --- */}
      {solution && (
        <div className="panel p-3 space-y-2">
          <button
            className="w-full flex items-center justify-between font-mono"
            onClick={() => setShowWind(!showWind)}
          >
            <span className="section-title">
              <span className="text-zinc-600 mr-1">MET:</span>Wind Correction
            </span>
            <span className="text-[10px] text-zinc-500 hover:text-accent">
              {showWind ? "COLLAPSE ▲" : "EXPAND ▼"}
            </span>
          </button>

          {showWind && (
            <div className="space-y-2.5 pt-1 animate-fadeIn">
              <div className="text-[9px] font-mono text-zinc-400 leading-snug">
                Enter the wind speed and compass direction (where it blows FROM).
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="label !text-[8px]">SPEED (M/S)</span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    placeholder="0.0"
                    className="field w-full font-mono text-xs text-accent"
                    value={windSpeed}
                    onChange={(e) => setWindSpeed(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="label !text-[8px]">DIRECTION (DEG)</span>
                  <input
                    type="number"
                    min="0"
                    max="359"
                    step="1"
                    placeholder="000°"
                    className="field w-full font-mono text-xs text-accent"
                    value={windDir}
                    onChange={(e) => setWindDir(e.target.value)}
                  />
                </div>
              </div>

              {(windSpeed || windDir) && (() => {
                const fireDeg = solution.bearingDeg;
                const wDir = Number(windDir) || 0;
                const wSpeed = Number(windSpeed) || 0;

                const fireRad = (fireDeg * Math.PI) / 180;
                const windRad = (wDir * Math.PI) / 180;
                const alpha = fireRad - windRad;

                const headwind = wSpeed * Math.cos(alpha);
                const crosswind = wSpeed * Math.sin(alpha);

                // Approx drift coefficients
                const driftCross = crosswind * solution.tofSec * 0.45;
                const driftAlong = headwind * solution.tofSec * 0.55;

                return (
                  <div className="border border-line/40 bg-black/20 p-2 rounded-sm space-y-1.5 font-mono text-[10px]">
                    <div className="flex justify-between border-b border-line/20 pb-1">
                      <span className="text-zinc-500">Crosswind:</span>
                      <span className={Math.abs(crosswind) > 0.1 ? "text-accent" : "text-zinc-400"}>
                        {Math.abs(crosswind).toFixed(1)} m/s {crosswind > 0 ? "L ➔ R" : crosswind < 0 ? "R ➔ L" : ""}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-line/20 pb-1">
                      <span className="text-zinc-500">Headwind:</span>
                      <span className={Math.abs(headwind) > 0.1 ? "text-amber-400" : "text-zinc-400"}>
                        {Math.abs(headwind).toFixed(1)} m/s {headwind > 0 ? "HEAD" : headwind < 0 ? "TAIL" : ""}
                      </span>
                    </div>
                    <div className="pt-1.5 space-y-1">
                      <div className="section-title !text-red-400">🚨 ESTIMATED DRIFT</div>
                      <div className="flex justify-between text-[9px] text-zinc-400">
                        <span>Lateral:</span>
                        <span className={Math.abs(driftCross) > 0.5 ? "text-red-400" : ""}>
                          {Math.abs(driftCross).toFixed(0)}m {driftCross > 0 ? "RIGHT" : driftCross < 0 ? "LEFT" : "NONE"}
                        </span>
                      </div>
                      <div className="flex justify-between text-[9px] text-zinc-400">
                        <span>Longitudinal:</span>
                        <span className={Math.abs(driftAlong) > 0.5 ? "text-red-400" : ""}>
                          {Math.abs(driftAlong).toFixed(0)}m {driftAlong > 0 ? "SHORT" : driftAlong < 0 ? "OVER" : "NONE"}
                        </span>
                      </div>

                      <div className="section-title !text-emerald-400 pt-1.5">⚡ COMPENSATE TARGET</div>
                      <div className="text-[10px] text-emerald-400 flex items-center justify-between font-bold border border-emerald-500/30 bg-emerald-950/20 px-1.5 py-0.5 rounded-sm">
                        <span>AIM OFFSET:</span>
                        <span>
                          {Math.abs(driftCross) > 0.5 ? `${Math.abs(driftCross).toFixed(0)}m ${driftCross > 0 ? "LEFT" : "RIGHT"}` : ""}
                          {Math.abs(driftCross) > 0.5 && Math.abs(driftAlong) > 0.5 ? " · " : ""}
                          {Math.abs(driftAlong) > 0.5 ? `${Math.abs(driftAlong).toFixed(0)}m ${driftAlong > 0 ? "OVER" : "SHORT"}` : ""}
                          {Math.abs(driftCross) <= 0.5 && Math.abs(driftAlong) <= 0.5 ? "0m" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {solution && solution.warnings.length > 0 && (
        <div className="panel border-danger/40 p-3 space-y-1 shadow-[0_0_12px_rgba(224,70,70,0.06)]">
          <div className="section-title text-danger flex items-center">
            // WARNINGS
            <InfoHint
              width={260}
              text={
                <>
                  Issues that may make the solution inaccurate or unreachable.
                  Try another charge or check the gun/target elevations.
                </>
              }
            />
          </div>
          {solution.warnings.map((w, i) => (
            <div key={i} className="font-mono text-xs text-danger/90">
              · {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
