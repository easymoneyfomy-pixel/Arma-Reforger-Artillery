import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function HelpModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#06070adc]/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6 border-accentDim/40 shadow-[0_0_40px_rgba(214,255,58,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <div className="section-title text-lg text-accent tracking-[0.25em] font-semibold flex items-center gap-3">
              <span className="inline-block w-3 h-3 rounded-full bg-accent animate-pulse shadow-[0_0_10px_rgba(214,255,58,0.8)]"></span>
              SYS: QUICK START GUIDE & MANUAL
            </div>
            <div className="font-mono text-xs uppercase tracking-wider text-zinc-500 mt-1">
              Fire Direction Control · Arma Reforger Artillery Calculator
            </div>
          </div>
          <button 
            className="btn border-accentDim/40 hover:bg-accentDim/10 text-xs px-4 py-2"
            onClick={onClose}
          >
            [ESC] Close
          </button>
        </div>

        {/* Step-by-step Visual Guide */}
        <div className="space-y-5">
          {/* Step 01 */}
          <div className="flex gap-4 items-start p-4 bg-black/25 border border-line/40 rounded-sm">
            <div className="flex-shrink-0 w-12 h-12 bg-accentDim/10 border-2 border-accent/40 rounded-full flex items-center justify-center font-mono text-xl font-bold text-accent">
              1
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🔫</span>
                <span className="section-title text-accent/90">[01] Select Weapon & Ammo</span>
              </div>
              <p className="font-mono text-sm text-zinc-400 mb-2">
                Choose your artillery system on the <strong className="text-zinc-200">left panel</strong>. 
              </p>
<ul className="font-mono text-xs text-zinc-400 space-y-1 pl-4 list-disc">
                 <li><strong className="text-accent">Vanilla:</strong> M252 81mm, 2B14 Podnos, M120 120mm - доступно всем</li>
                 <li><strong className="text-amber-400">Premium:</strong> M119A2 105mm, D-30 122mm, M777 155mm, M109A6 Paladin - только для авторизованных</li>
               </ul>
            </div>
          </div>

          {/* Step 02 */}
          <div className="flex gap-4 items-start p-4 bg-black/25 border border-line/40 rounded-sm">
            <div className="flex-shrink-0 w-12 h-12 bg-accentDim/10 border-2 border-accent/40 rounded-full flex items-center justify-center font-mono text-xl font-bold text-accent">
              2
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🎯</span>
                <span className="section-title text-accent/90">[02] Place Coordinates</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                <div className="bg-black/30 p-2 rounded-sm text-center">
                  <div className="text-accent font-bold">Press G</div>
                  <div className="text-[10px] text-zinc-500">Place Gun mode</div>
                </div>
                <div className="bg-black/30 p-2 rounded-sm text-center">
                  <div className="text-accent font-bold">Click Map</div>
                  <div className="text-[10px] text-zinc-500">Set position</div>
                </div>
                <div className="bg-black/30 p-2 rounded-sm text-center">
                  <div className="text-accent font-bold">Press T</div>
                  <div className="text-[10px] text-zinc-500">Place Target mode</div>
                </div>
              </div>
              <p className="font-mono text-xs text-zinc-400">
                Или введите координаты вручную (X, Y в метрах от угла карты).
              </p>
            </div>
          </div>

          {/* Step 03 */}
          <div className="flex gap-4 items-start p-4 bg-black/25 border border-line/40 rounded-sm">
            <div className="flex-shrink-0 w-12 h-12 bg-accentDim/10 border-2 border-accent/40 rounded-full flex items-center justify-center font-mono text-xl font-bold text-accent">
              3
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📊</span>
                <span className="section-title text-accent/90">[03] Read Firing Solution</span>
              </div>
              <div className="flex gap-4 text-xs font-mono">
                <div>
                  <span className="text-accent">Bearing:</span> <span className="text-zinc-300">милы (0-6400) и градусы</span>
                </div>
                <div>
                  <span className="text-accent">Elevation:</span> <span className="text-zinc-300">милы от 0 до 1500+</span>
                </div>
                <div>
                  <span className="text-accent">TOF:</span> <span className="text-zinc-300">время полёта в секундах</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 04 */}
          <div className="flex gap-4 items-start p-4 bg-black/25 border border-line/40 rounded-sm">
            <div className="flex-shrink-0 w-12 h-12 bg-accentDim/10 border-2 border-accent/40 rounded-full flex items-center justify-center font-mono text-xl font-bold text-accent">
              4
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🔄</span>
                <span className="section-title text-accent/90">[04] Corrections (Pro Only)</span>
              </div>
              <p className="font-mono text-xs text-zinc-400">
                Введите координаты осады - система покажет поправки: <strong className="text-zinc-200">over/short</strong> и <strong className="text-zinc-200">left/right</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Map Controls - Visual */}
        <div className="bg-black/20 border border-line/40 p-4 rounded-sm">
          <div className="section-title text-accent/90 mb-3 flex items-center gap-2">
            <span className="text-xl">🗺️</span>
            MAP NAVIGATION
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-black/30 rounded-sm">
              <div className="text-2xl mb-1">🔍</div>
              <div className="font-mono text-[10px] text-accent">Mouse Wheel</div>
              <div className="text-[9px] text-zinc-500">Zoom in/out</div>
            </div>
            <div className="text-center p-3 bg-black/30 rounded-sm">
              <div className="text-2xl mb-1">✋</div>
              <div className="font-mono text-[10px] text-accent">Shift + Drag</div>
              <div className="text-[9px] text-zinc-500">Pan map</div>
            </div>
            <div className="text-center p-3 bg-black/30 rounded-sm">
              <div className="text-2xl mb-1">🏠</div>
              <div className="font-mono text-[10px] text-accent">(click house icon)</div>
              <div className="text-[9px] text-zinc-500">Reset view</div>
            </div>
            <div className="text-center p-3 bg-black/30 rounded-sm">
              <div className="text-2xl mb-1">📏</div>
              <div className="font-mono text-[10px] text-accent">Built-in grids</div>
              <div className="text-[9px] text-zinc-500">Everon / Arland</div>
            </div>
          </div>
        </div>

        {/* Premium Features */}
        <div className="bg-amber-400/5 border border-amber-400/20 p-4 rounded-sm">
          <div className="section-title text-amber-400 mb-3 flex items-center gap-2">
            <span className="text-xl">👑</span>
            PREMIUM FEATURES (via Telegram Bot)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            <div className="text-zinc-300">🔓 Custom map uploads (PNG/JPG)</div>
            <div className="text-zinc-300">🎯 CEP dispersion circle</div>
            <div className="text-zinc-300">💨 MET wind correction</div>
            <div className="text-zinc-300">📍 Preset landmarks</div>
            <div className="text-zinc-300">🔫 Modded weapons</div>
            <div className="text-zinc-300">⚙️ Map calibration</div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-400/20">
            <a href="https://t.me/Arma_Artillery_Bot" className="btn-primary text-xs inline-flex items-center gap-2">
              🤖 Авторизоваться через @Arma_Artillery_Bot
            </a>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end border-t border-line pt-4">
          <button className="btn-primary px-6 py-2" onClick={onClose}>
            Acknowledge [ENTER]
          </button>
        </div>
      </div>
    </div>
  );
}