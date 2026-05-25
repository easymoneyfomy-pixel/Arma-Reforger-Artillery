import type { FiringSolution } from "../types";
import { milToRad } from "../lib/coords";
import { InfoHint } from "./Tooltip";

type Props = {
  solution: FiringSolution | null;
};

const G = 9.81;

// Use ToF and range to back out the initial velocity assuming projectile motion
// over flat ground. Then plot the parabolic trajectory.
function computeArc(range: number, tof: number, elevMil: number) {
  if (!Number.isFinite(range) || !Number.isFinite(tof) || tof <= 0 || range <= 0) return null;
  const theta = milToRad(elevMil);
  // For projectile motion on level ground: range = v cosθ · t, apex h = (v sinθ)^2 / (2g)
  // We accept the tabular tof even though the simple model would give a different value —
  // the apex/curve we plot is an approximation tied to the elevation angle and table tof.
  const v = range / Math.max(0.01, Math.cos(theta)) / tof;
  const apex = (v * Math.sin(theta)) ** 2 / (2 * G);
  return { v, apex, theta };
}

export default function TrajectoryProfile({ solution }: Props) {
  if (!solution) {
    return (
      <div className="panel p-3">
        <span className="section-title">Trajectory</span>
        <div className="font-mono text-xs text-zinc-500 py-4 text-center">
          No solution.
        </div>
      </div>
    );
  }
  const arc = computeArc(solution.rangeM, solution.tofSec, solution.elevationMil);
  const W = 260;
  const H = 90;
  const padX = 10;
  const padTop = 14;
  const padBot = 18;
  const plotW = W - padX * 2;
  const plotH = H - padTop - padBot;
  const apex = arc?.apex ?? 1;
  const R = solution.rangeM;
  // Sample the parabola y = 4·apex·(x/R)·(1 - x/R)
  const points: string[] = [];
  const N = 60;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = u * R;
    const y = 4 * apex * (x / R) * (1 - x / R);
    const px = padX + u * plotW;
    const py = padTop + (1 - y / Math.max(1, apex)) * plotH;
    points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
  }
  const path = points.join(" ");

  return (
    <div className="panel p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="section-title flex items-center">
          Trajectory
          <InfoHint
            width={300}
            text={
              <>
                Simplified projectile-motion arc derived from the table's <b>range</b>,
                <b> ToF</b> and <b>elevation</b>. Apex height is an estimate — useful
                for terrain-clearance sanity checks, not precision.
              </>
            }
          />
        </span>
        <span className="font-mono text-[10px] text-zinc-500">
          apex ≈ <span className="text-accent">{(arc?.apex ?? 0).toFixed(0)} m</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        {/* baseline */}
        <line
          x1={padX}
          y1={padTop + plotH}
          x2={W - padX}
          y2={padTop + plotH}
          stroke="rgba(214,255,58,0.4)"
        />
        {/* axis ticks */}
        <line x1={padX} y1={padTop} x2={padX} y2={padTop + plotH} stroke="rgba(214,255,58,0.2)" />
        {/* arc */}
        <polyline
          fill="none"
          stroke="#d6ff3a"
          strokeWidth={1.5}
          points={path}
        />
        {/* gun marker */}
        <circle cx={padX} cy={padTop + plotH} r={3} fill="#34d399" />
        {/* target marker */}
        <circle cx={W - padX} cy={padTop + plotH} r={3} fill="#f87171" />
        {/* apex marker */}
        <circle cx={W / 2} cy={padTop} r={2} fill="#d6ff3a" />
        <text x={W / 2 + 4} y={padTop + 4} fontSize={9} fontFamily="ui-monospace, monospace" fill="#d6ff3a">
          apex {(arc?.apex ?? 0).toFixed(0)}m
        </text>
        <text x={padX + 2} y={H - 4} fontSize={9} fontFamily="ui-monospace, monospace" fill="#34d399">
          GUN
        </text>
        <text x={W - padX - 32} y={H - 4} fontSize={9} fontFamily="ui-monospace, monospace" fill="#f87171">
          TGT {R.toFixed(0)}m
        </text>
      </svg>
      <div className="font-mono text-[10px] text-zinc-500 flex justify-between">
        <span>elev {solution.elevationMil.toFixed(0)} mil</span>
        <span>ToF {solution.tofSec.toFixed(1)}s</span>
        <span className={solution.arc === "high" ? "text-accent" : "text-amber-400"}>
          {solution.arc.toUpperCase()} arc
        </span>
      </div>
    </div>
  );
}
