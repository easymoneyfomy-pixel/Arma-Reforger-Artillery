import { useEffect, useMemo, useRef, useState } from 'react';
import { Panel } from './Panel';
import { BASE_MAPS, pxToWorld, worldToPx } from '../lib/maps';
import { formatGrid } from '../lib/coordinates';
import type { MapData, Point3D } from '../types';

interface Props {
  maps: MapData[];
  activeMapId: string;
  onSelectMap: (id: string) => void;
  gun: Point3D;
  target: Point3D;
  impact: Point3D | null;
  onSetGun: (p: { x: number; y: number }) => void;
  onSetTarget: (p: { x: number; y: number }) => void;
  onOpenCustomMap: () => void;
}

type PlaceMode = 'target' | 'gun';

export function MapView(props: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<PlaceMode>('target');
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const map = props.maps.find((m) => m.id === props.activeMapId) ?? props.maps[0];

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Fit map image into container while preserving aspect ratio.
  const layout = useMemo(() => {
    if (!map || !containerSize.w || !containerSize.h) {
      return null;
    }
    const imgAR = map.imgWidth / map.imgHeight;
    const ctnAR = containerSize.w / containerSize.h;
    let w = containerSize.w;
    let h = containerSize.h;
    if (imgAR > ctnAR) {
      h = containerSize.w / imgAR;
    } else {
      w = containerSize.h * imgAR;
    }
    const left = (containerSize.w - w) / 2;
    const top = (containerSize.h - h) / 2;
    return { w, h, left, top, scaleX: w / map.imgWidth, scaleY: h / map.imgHeight };
  }, [map, containerSize]);

  function eventToWorld(e: React.MouseEvent) {
    if (!layout || !map) return null;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const px = ((e.clientX - rect.left) - layout.left) / layout.scaleX;
    const py = ((e.clientY - rect.top) - layout.top) / layout.scaleY;
    if (px < 0 || py < 0 || px > map.imgWidth || py > map.imgHeight) return null;
    return pxToWorld(map, { x: px, y: py });
  }

  function onClick(e: React.MouseEvent) {
    const w = eventToWorld(e);
    if (!w) return;
    if (mode === 'gun') props.onSetGun(w);
    else props.onSetTarget(w);
  }

  function onMove(e: React.MouseEvent) {
    const w = eventToWorld(e);
    setHover(w);
  }

  const gunPx = map && layout ? worldToPx(map, props.gun) : null;
  const tgtPx = map && layout ? worldToPx(map, props.target) : null;
  const impactPx = map && layout && props.impact ? worldToPx(map, props.impact) : null;

  return (
    <Panel
      title="Tactical Map"
      right={
        <div className="flex items-center gap-1">
          <select
            className="bg-bg border border-line text-accent px-1.5 py-0.5 text-[10px] uppercase tracking-wider focus:outline-none"
            value={map?.id ?? ''}
            onChange={(e) => props.onSelectMap(e.target.value)}
          >
            {props.maps.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button type="button" className="btn !px-2 !py-0.5 text-[10px]" onClick={props.onOpenCustomMap}>
            + Custom
          </button>
        </div>
      }
      bodyClassName="!p-0"
    >
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-line bg-bg-raised/40 text-[10px] uppercase tracking-wider">
        <span className="text-muted">Click to place:</span>
        <button
          type="button"
          className={`btn !px-2 !py-0.5 ${mode === 'gun' ? 'btn-primary' : ''}`}
          onClick={() => setMode('gun')}
        >
          ◆ Gun
        </button>
        <button
          type="button"
          className={`btn !px-2 !py-0.5 ${mode === 'target' ? 'btn-primary' : ''}`}
          onClick={() => setMode('target')}
        >
          ✕ Target
        </button>
        <span className="ml-auto text-muted">
          {hover ? formatGrid(hover, 4) : '—'}
        </span>
      </div>
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ height: '460px', background: '#0a0c0a' }}
        onClick={onClick}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {map && layout && (
          <>
            <div
              className="absolute"
              style={{
                left: layout.left,
                top: layout.top,
                width: layout.w,
                height: layout.h,
                background: map.imageUrl
                  ? `url(${map.imageUrl}) center/100% 100% no-repeat`
                  : 'linear-gradient(135deg, #0f1310 0%, #141a15 100%)',
                outline: '1px solid #1f2a21',
              }}
            >
              {!map.imageUrl && <ProceduralMap map={map} />}
              <GridOverlay map={map} width={layout.w} height={layout.h} />
            </div>

            {gunPx && (
              <Marker
                left={layout.left + gunPx.x * layout.scaleX}
                top={layout.top + gunPx.y * layout.scaleY}
                color="#7fb069"
                label="GUN"
                shape="diamond"
              />
            )}
            {tgtPx && (
              <Marker
                left={layout.left + tgtPx.x * layout.scaleX}
                top={layout.top + tgtPx.y * layout.scaleY}
                color="#d4a256"
                label="TGT"
                shape="cross"
              />
            )}
            {impactPx && (
              <Marker
                left={layout.left + impactPx.x * layout.scaleX}
                top={layout.top + impactPx.y * layout.scaleY}
                color="#c44d4d"
                label="IMP"
                shape="ring"
              />
            )}
            {gunPx && tgtPx && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={containerSize.w}
                height={containerSize.h}
              >
                <line
                  x1={layout.left + gunPx.x * layout.scaleX}
                  y1={layout.top + gunPx.y * layout.scaleY}
                  x2={layout.left + tgtPx.x * layout.scaleX}
                  y2={layout.top + tgtPx.y * layout.scaleY}
                  stroke="#7fb069"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.5"
                />
              </svg>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}

function GridOverlay({ map, width, height }: { map: MapData; width: number; height: number }) {
  // 1 km grid based on world size.
  const worldSize = map.calibration
    ? Math.max(Math.abs(map.calibration.p2.wx - map.calibration.p1.wx), 4096) * 2
    : map.worldSize_m;
  const cells = Math.max(2, Math.min(20, Math.round(worldSize / 1000)));
  const lines = [];
  for (let i = 1; i < cells; i++) {
    const f = i / cells;
    lines.push(
      <line key={`v${i}`} x1={width * f} y1={0} x2={width * f} y2={height} stroke="#7fb069" strokeOpacity="0.12" strokeWidth="1" />,
      <line key={`h${i}`} x1={0} y1={height * f} x2={width} y2={height * f} stroke="#7fb069" strokeOpacity="0.12" strokeWidth="1" />
    );
  }
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {lines}
    </svg>
  );
}

function ProceduralMap({ map }: { map: MapData }) {
  // No real image asset bundled — render a stylised topo backdrop.
  const seed = BASE_MAPS.findIndex((m) => m.id === map.id);
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <radialGradient id={`bg-${map.id}`} cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#1a2118" />
          <stop offset="100%" stopColor="#0a0c0a" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#bg-${map.id})`} />
      {Array.from({ length: 8 }).map((_, i) => {
        const r = 12 + i * 4 + seed * 2;
        return (
          <circle
            key={i}
            cx={50 + Math.sin(i + seed) * 18}
            cy={50 + Math.cos(i * 1.4 + seed) * 14}
            r={r}
            fill="none"
            stroke="#4a6b3d"
            strokeOpacity={0.18 - i * 0.015}
            strokeWidth="0.2"
          />
        );
      })}
    </svg>
  );
}

function Marker({
  left,
  top,
  color,
  label,
  shape,
}: {
  left: number;
  top: number;
  color: string;
  label: string;
  shape: 'diamond' | 'cross' | 'ring';
}) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{ left, top, transform: 'translate(-50%, -50%)' }}
    >
      <svg width="28" height="28" viewBox="0 0 28 28">
        {shape === 'diamond' && (
          <polygon points="14,4 24,14 14,24 4,14" fill="none" stroke={color} strokeWidth="2" />
        )}
        {shape === 'cross' && (
          <>
            <line x1="4" y1="4" x2="24" y2="24" stroke={color} strokeWidth="2" />
            <line x1="24" y1="4" x2="4" y2="24" stroke={color} strokeWidth="2" />
          </>
        )}
        {shape === 'ring' && (
          <>
            <circle cx="14" cy="14" r="9" fill="none" stroke={color} strokeWidth="2" />
            <circle cx="14" cy="14" r="2" fill={color} />
          </>
        )}
      </svg>
      <div
        className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-[9px] tracking-widest"
        style={{ color }}
      >
        {label}
      </div>
    </div>
  );
}
