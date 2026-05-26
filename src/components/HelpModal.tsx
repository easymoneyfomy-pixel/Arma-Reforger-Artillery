import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function HelpModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#06070adc]/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 border-accentDim/40 shadow-[0_0_30px_rgba(214,255,58,0.06)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <div className="section-title text-base text-accent tracking-[0.25em] font-semibold flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse"></span>
              SYS: QUICK START GUIDE &amp; MANUAL
            </div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 mt-1">
              Fire Direction Control · Arma Reforger Artillery Calculator
            </div>
          </div>
          <button 
            className="btn border-accentDim/40 hover:bg-accentDim/10 text-xs px-4" 
            onClick={onClose} 
            title="Close (Esc)"
          >
            [ ESC ] Close
          </button>
        </div>

        {/* Tactical Info Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="bg-black/20 border border-line/40 p-3.5 rounded-sm relative">
            <div className="absolute top-0 right-3 font-mono text-[8px] text-zinc-600">FDC: 01</div>
            <div className="section-title text-accent/90 mb-1.5">[01] WEAPON &amp; AMMO</div>
            <p className="font-mono text-xs text-zinc-400 leading-relaxed">
              Choose your weapon system on the left panel. <strong className="text-zinc-300">[mod]</strong> requires a community mod. Pick an ammunition type and set the propellant charge. 
              <br />
              <span className="text-accentDim">Override AUTO charge to adjust altitude/arc geometry.</span>
            </p>
          </section>

          <section className="bg-black/20 border border-line/40 p-3.5 rounded-sm relative">
            <div className="absolute top-0 right-3 font-mono text-[8px] text-zinc-600">FDC: 02</div>
            <div className="section-title text-accent/90 mb-1.5">[02] POSITION &amp; COORDINATES</div>
            <p className="font-mono text-xs text-zinc-400 leading-relaxed">
              Define Gun and Target coordinates via:
            </p>
            <ul className="font-mono text-[11px] text-zinc-400 leading-relaxed list-disc pl-4 space-y-1 mt-1">
              <li>Toggle placement modes &amp; click the tactical map directly.</li>
              <li>Input coordinates (Easting/Northing) manually.</li>
              <li>Paste a standard 6/8/10-digit grid string.</li>
            </ul>
          </section>

          <section className="bg-black/20 border border-line/40 p-3.5 rounded-sm relative">
            <div className="absolute top-0 right-3 font-mono text-[8px] text-zinc-600">FDC: 03</div>
            <div className="section-title text-accent/90 mb-1.5">[03] FIRING SOLUTIONS</div>
            <p className="font-mono text-xs text-zinc-400 leading-relaxed">
              Telemetry resolves on the right panel instantly.
              Adjust your mortar or howitzer barrel to the computed <strong className="text-zinc-300">Azimuth</strong> (bearing, mils &amp; degrees), and <strong className="text-zinc-300">Elevation</strong> (angle). Ensure to match the target charge.
            </p>
          </section>

          <section className="bg-black/20 border border-line/40 p-3.5 rounded-sm relative">
            <div className="absolute top-0 right-3 font-mono text-[8px] text-zinc-600">FDC: 04</div>
            <div className="section-title text-accent/90 mb-1.5">[04] BALLISTIC CORRECTIONS</div>
            <p className="font-mono text-xs text-zinc-400 leading-relaxed">
              Input the grid of the shell splash into the Correction panel. The computer yields linear offset corrections (over/short, left/right). Click <strong className="text-zinc-300">Apply Correction</strong> to offset the next calculation.
            </p>
          </section>

          <section className="bg-black/20 border border-line/40 p-3.5 rounded-sm relative">
            <div className="absolute top-0 right-3 font-mono text-[8px] text-zinc-600">FDC: 05</div>
            <div className="section-title text-accent/90 mb-1.5">[05] MAP NAVIGATION</div>
            <p className="font-mono text-xs text-zinc-400 leading-relaxed">
              Scroll <strong className="text-zinc-300">Mouse Wheel</strong> to zoom centered on your cursor. Drag with <strong className="text-zinc-300">Shift + Left Mouse</strong> or <strong className="text-zinc-300">Middle Mouse</strong> to pan. Reset or scale map viewport with control overlays.
            </p>
          </section>

          <section className="bg-black/20 border border-line/40 p-3.5 rounded-sm relative">
            <div className="absolute top-0 right-3 font-mono text-[8px] text-zinc-600">FDC: 06</div>
            <div className="section-title text-accent/90 mb-1.5">[06] OFFICIAL &amp; CUSTOM TERRAINS</div>
            <p className="font-mono text-xs text-zinc-400 leading-relaxed">
              Built-in satellite maps (Everon, Arland) preload automatically. Upload custom terrain files (<strong className="text-zinc-300">PNG/JPG/WebP &lt;12MB</strong>) and set their map size. Use <strong className="text-zinc-300">Calibrate</strong> for manual coordinates.
            </p>
          </section>
        </div>

        {/* Shortcuts Section */}
        <section className="bg-black/15 border border-line/30 p-4 rounded-sm">
          <div className="section-title text-accent/90 mb-3">[SYS] SYSTEM KEYBOARD SHORTCUTS</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 font-mono text-xs">
            <div className="flex items-center space-x-2 bg-black/40 border border-line/30 px-2 py-1.5 rounded-sm">
              <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-accentDim/10 border border-accentDim/40 text-accent rounded text-[10px] font-bold">G</kbd>
              <span className="text-zinc-400">Place GUN mode</span>
            </div>
            <div className="flex items-center space-x-2 bg-black/40 border border-line/30 px-2 py-1.5 rounded-sm">
              <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-accentDim/10 border border-accentDim/40 text-accent rounded text-[10px] font-bold">T</kbd>
              <span className="text-zinc-400">Place TARGET mode</span>
            </div>
            <div className="flex items-center space-x-2 bg-black/40 border border-line/30 px-2 py-1.5 rounded-sm">
              <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-accentDim/10 border border-accentDim/40 text-accent rounded text-[10px] font-bold">S</kbd>
              <span className="text-zinc-400">Swap Gun/Target</span>
            </div>
            <div className="flex items-center space-x-2 bg-black/40 border border-line/30 px-2 py-1.5 rounded-sm">
              <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-accentDim/10 border border-accentDim/40 text-accent rounded text-[10px] font-bold">R</kbd>
              <span className="text-zinc-400">Reset positions</span>
            </div>
            <div className="flex items-center space-x-2 bg-black/40 border border-line/30 px-2 py-1.5 rounded-sm">
              <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-accentDim/10 border border-accentDim/40 text-accent rounded text-[10px] font-bold">A</kbd>
              <span className="text-zinc-400">Toggle AUTO charge</span>
            </div>
            <div className="flex items-center space-x-2 bg-black/40 border border-line/30 px-2 py-1.5 rounded-sm">
              <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-accentDim/10 border border-accentDim/40 text-accent rounded text-[10px] font-bold">Wheel</kbd>
              <span className="text-zinc-400">Zoom Map View</span>
            </div>
            <div className="flex items-center space-x-2 bg-black/40 border border-line/30 px-2 py-1.5 rounded-sm">
              <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-accentDim/10 border border-accentDim/40 text-accent rounded text-[10px] font-bold">Shift+Drag</kbd>
              <span className="text-zinc-400">Pan Map View</span>
            </div>
            <div className="flex items-center space-x-2 bg-black/40 border border-line/30 px-2 py-1.5 rounded-sm">
              <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-accentDim/10 border border-accentDim/40 text-accent rounded text-[10px] font-bold">?</kbd>
              <span className="text-zinc-400">Toggle help modal</span>
            </div>
            <div className="flex items-center space-x-2 bg-black/40 border border-line/30 px-2 py-1.5 rounded-sm">
              <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-accentDim/10 border border-accentDim/40 text-accent rounded text-[10px] font-bold">Esc</kbd>
              <span className="text-zinc-400">Close modal</span>
            </div>
          </div>
        </section>

        {/* Security / Privacy */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-accentDim/5 border border-accentDim/20 p-3 rounded-sm text-xs font-mono">
          <div className="text-zinc-400 pr-2">
            <span className="text-accent font-semibold">[SEC] DATA PARITY &amp; COOKIES:</span> Everything stays on client storage. Zero server calls are executed. 
          </div>
          <div className="text-[10px] text-zinc-500 whitespace-nowrap mt-1.5 sm:mt-0">
            FDC LOCAL ENGINE v1.0
          </div>
        </div>

        {/* Close Actions */}
        <div className="flex justify-end border-t border-line pt-4 gap-2">
          <button className="btn-primary px-6" onClick={onClose}>
            Acknowledge [ENTER]
          </button>
        </div>
      </div>
    </div>
  );
}
