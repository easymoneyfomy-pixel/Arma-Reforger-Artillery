import { useRef, useState } from 'react';
import { fileToDataUrl, loadImageDims } from '../lib/maps';
import type { CustomMapCalibration, MapData } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCommit: (map: MapData) => void;
}

interface PickingPoint {
  px: number;
  py: number;
  wx: string;
  wy: string;
}

/**
 * Two-step modal:
 *   1) Upload an image.
 *   2) Click two reference points on the image, then enter the in-game X/Y
 *      meters for each. We derive the affine calibration from those two
 *      anchors.
 */
export function CustomMapDialog({ open, onClose, onCommit }: Props) {
  const [name, setName] = useState('Custom Map');
  const [src, setSrc] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [p1, setP1] = useState<PickingPoint | null>(null);
  const [p2, setP2] = useState<PickingPoint | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const imgRef = useRef<HTMLImageElement | null>(null);

  if (!open) return null;

  function reset() {
    setName('Custom Map');
    setSrc(null);
    setDims(null);
    setP1(null);
    setP2(null);
    setStep(1);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const dataUrl = await fileToDataUrl(f);
    const d = await loadImageDims(dataUrl);
    setSrc(dataUrl);
    setDims(d);
    setName(f.name.replace(/\.[^.]+$/, ''));
    setStep(2);
  }

  function onImgClick(e: React.MouseEvent<HTMLImageElement>) {
    if (!imgRef.current || !dims) return;
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = dims.w / rect.width;
    const scaleY = dims.h / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    if (!p1) setP1({ px, py, wx: '', wy: '' });
    else if (!p2) setP2({ px, py, wx: '', wy: '' });
    else {
      // Cycle: reset and start over with the new click as p1.
      setP1({ px, py, wx: '', wy: '' });
      setP2(null);
    }
  }

  function commit() {
    if (!src || !dims || !p1 || !p2) return;
    const wx1 = parseFloat(p1.wx);
    const wy1 = parseFloat(p1.wy);
    const wx2 = parseFloat(p2.wx);
    const wy2 = parseFloat(p2.wy);
    if (![wx1, wy1, wx2, wy2].every(Number.isFinite)) {
      alert('Enter all four world-coordinate values.');
      return;
    }
    if (Math.abs(wx2 - wx1) < 1 && Math.abs(wy2 - wy1) < 1) {
      alert('Calibration points must differ in world coordinates.');
      return;
    }
    const calibration: CustomMapCalibration = {
      p1: { px: p1.px, py: p1.py, wx: wx1, wy: wy1 },
      p2: { px: p2.px, py: p2.py, wx: wx2, wy: wy2 },
    };
    const map: MapData = {
      id: `custom-${Date.now()}`,
      name,
      source: 'custom',
      imageUrl: src,
      imgWidth: dims.w,
      imgHeight: dims.h,
      worldSize_m: Math.max(Math.abs(wx2 - wx1), Math.abs(wy2 - wy1)) * 2,
      calibration,
    };
    onCommit(map);
    reset();
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          reset();
          onClose();
        }
      }}
    >
      <div className="panel w-full max-w-3xl max-h-[90vh] overflow-auto">
        <header className="panel-title">
          <span>Add Custom Map · Step {step}/2</span>
          <button
            type="button"
            className="btn !px-2 !py-0.5"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            ✕
          </button>
        </header>
        <div className="panel-body space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-muted leading-relaxed">
                Upload a top-down map image (PNG/JPG). Origin convention: in-game
                world is meters, X = east, Y = north. After upload, you'll mark
                two reference points to lock the pixel→world transform.
              </p>
              <label className="btn btn-primary inline-block cursor-pointer">
                Choose image…
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFile}
                />
              </label>
            </div>
          )}

          {step === 2 && src && dims && (
            <div className="space-y-3">
              <div>
                <label className="field-label">Map name</label>
                <input
                  className="field-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <p className="text-xs text-muted leading-snug">
                Click two reference points on the map (e.g. opposite corners of
                the playable area, or any two known grid intersections). Then
                enter their in-game X (east) and Y (north) coordinates in
                meters.
              </p>

              <div className="relative inline-block border border-line">
                <img
                  ref={imgRef}
                  src={src}
                  alt="custom map"
                  className="block max-h-[55vh] max-w-full cursor-crosshair"
                  onClick={onImgClick}
                />
                {p1 && <CalibMarker img={imgRef.current} dims={dims} px={p1.px} py={p1.py} idx={1} />}
                {p2 && <CalibMarker img={imgRef.current} dims={dims} px={p2.px} py={p2.py} idx={2} />}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CalibInput
                  title="Point 1"
                  active={!!p1 && !p2}
                  point={p1}
                  onChange={(np) => setP1(np)}
                />
                <CalibInput
                  title="Point 2"
                  active={!!p1 && !!p2}
                  point={p2}
                  onChange={(np) => setP2(np)}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setP1(null);
                    setP2(null);
                  }}
                >
                  Reset points
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={commit}
                  disabled={!p1 || !p2}
                >
                  Save Map
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CalibMarker({
  img,
  dims,
  px,
  py,
  idx,
}: {
  img: HTMLImageElement | null;
  dims: { w: number; h: number };
  px: number;
  py: number;
  idx: number;
}) {
  if (!img) return null;
  const rect = img.getBoundingClientRect();
  const x = (px / dims.w) * rect.width;
  const y = (py / dims.h) * rect.height;
  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: x, top: y, transform: 'translate(-50%,-50%)' }}
    >
      <div className="w-4 h-4 border-2 border-warn rounded-full" />
      <div className="text-[10px] text-warn font-bold absolute -top-3 left-4">P{idx}</div>
    </div>
  );
}

function CalibInput({
  title,
  active,
  point,
  onChange,
}: {
  title: string;
  active: boolean;
  point: PickingPoint | null;
  onChange: (p: PickingPoint) => void;
}) {
  return (
    <div className={`border ${active ? 'border-accent-dim' : 'border-line'} p-2`}>
      <div className="text-[10px] uppercase tracking-wider text-muted mb-1">
        {title} {point ? `· px (${Math.round(point.px)}, ${Math.round(point.py)})` : '· click on map'}
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div>
          <label className="field-label">World X (m)</label>
          <input
            className="field-input"
            inputMode="numeric"
            disabled={!point}
            value={point?.wx ?? ''}
            onChange={(e) => point && onChange({ ...point, wx: e.target.value })}
          />
        </div>
        <div>
          <label className="field-label">World Y (m)</label>
          <input
            className="field-input"
            inputMode="numeric"
            disabled={!point}
            value={point?.wy ?? ''}
            onChange={(e) => point && onChange({ ...point, wy: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
