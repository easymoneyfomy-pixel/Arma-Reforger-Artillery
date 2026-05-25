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
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="section-title text-base">Quick Start · Artillery FDC</div>
            <div className="font-mono text-[10px] text-zinc-500">
              For Arma Reforger artillery — vanilla &amp; modded weapons
            </div>
          </div>
          <button className="btn" onClick={onClose} title="Close (Esc)">
            Close
          </button>
        </div>

        <section className="space-y-2">
          <div className="section-title text-accent/90">1 · Pick weapon &amp; ammo</div>
          <p className="font-mono text-xs text-zinc-300 leading-relaxed">
            Choose your tube on the left panel. <b>[mod]</b> means the weapon requires
            a community mod. Pick an ammunition (HE), and either leave the charge on{" "}
            <b>auto</b> or override it. Lower charge = steeper arc &amp; shorter range,
            higher charge = flatter &amp; longer range.
          </p>
        </section>

        <section className="space-y-2">
          <div className="section-title text-accent/90">2 · Set gun &amp; target</div>
          <p className="font-mono text-xs text-zinc-300 leading-relaxed">
            Three ways:
          </p>
          <ul className="font-mono text-xs text-zinc-300 leading-relaxed list-disc pl-5 space-y-1">
            <li>
              <b>Click the tactical map</b> — toggle <b>Place Gun</b> / <b>Place Target</b> and click.
            </li>
            <li>
              <b>Type meters</b> into X / Y fields directly.
            </li>
            <li>
              <b>Paste grid</b> (e.g. <span className="text-accent">016073</span> → X=01600, Y=07300) into the Grid box and press Enter.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <div className="section-title text-accent/90">3 · Read the firing solution</div>
          <p className="font-mono text-xs text-zinc-300 leading-relaxed">
            The right panel shows <b>Azimuth</b> (compass direction, mils &amp; degrees),
            <b> Elevation</b> (tube angle in NATO mils, 6400/circle), <b>Time of
            Flight</b>, range and the recommended charge. Set those on the gun.
            Warnings appear if range is outside the table or the altitude delta is large.
          </p>
        </section>

        <section className="space-y-2">
          <div className="section-title text-accent/90">4 · Correct rounds</div>
          <p className="font-mono text-xs text-zinc-300 leading-relaxed">
            After firing, enter the impact coordinates in the Correction panel. The
            tool computes <b>over/short</b> and <b>left/right</b> deltas relative to
            the gun-to-target line. <b>Apply Correction</b> mirrors the miss across
            the target so the next shot lands closer.
          </p>
        </section>

        <section className="space-y-2">
          <div className="section-title text-accent/90">5 · Map zoom &amp; pan</div>
          <p className="font-mono text-xs text-zinc-300 leading-relaxed">
            <b>Mouse wheel</b> over the map to zoom (anchors on the cursor).{" "}
            <b>Shift+drag</b> or <b>middle-mouse drag</b> to pan. Use the{" "}
            <b>+</b> / <b>−</b> / <b>⌂</b> buttons in the top-left of the map for
            zoom in / out / reset. On 12.8 km maps like Everon, zoom in for precision
            placement of gun and target.
          </p>
        </section>

        <section className="space-y-2">
          <div className="section-title text-accent/90">6 · Built-in &amp; custom maps</div>
          <p className="font-mono text-xs text-zinc-300 leading-relaxed">
            <b>Everon</b> and <b>Arland</b> ship with stylized topographic
            backgrounds out of the box — no upload required. To use your own,
            click <b>Upload</b> to load a top-down map screenshot
            (<b>PNG / JPG / WebP</b>, &lt;12 MB). Set the world size first — match
            it to the actual game world (Everon = 12800 m, Arland = 4096 m). For
            pixel-perfect coordinates on a custom map, use <b>Calibrate</b>: type
            the world X/Y of a landmark, click that pixel on the map, and repeat
            for a second far-away point.
          </p>
        </section>

        <section className="space-y-2">
          <div className="section-title text-accent/90">7 · Share the solution</div>
          <p className="font-mono text-xs text-zinc-300 leading-relaxed">
            Press <b>Copy</b> on the Firing Solution panel to copy a plain-text,
            radio-comms-formatted version of the firing data (weapon, charge,
            azimuth, elevation, range, TOF) to your clipboard. Paste it into your
            squad chat to call the fire mission.
          </p>
        </section>

        <section className="space-y-2">
          <div className="section-title text-accent/90">Keyboard shortcuts</div>
          <div className="grid grid-cols-2 gap-1 font-mono text-xs">
            <div>
              <span className="text-accent">G</span> — place GUN mode
            </div>
            <div>
              <span className="text-accent">T</span> — place TARGET mode
            </div>
            <div>
              <span className="text-accent">S</span> — swap gun/target
            </div>
            <div>
              <span className="text-accent">R</span> — reset positions
            </div>
            <div>
              <span className="text-accent">A</span> — toggle auto charge
            </div>
            <div>
              <span className="text-accent">Wheel</span> — zoom map
            </div>
            <div>
              <span className="text-accent">Shift+drag</span> — pan map
            </div>
            <div>
              <span className="text-accent">?</span> — open / close help
            </div>
            <div>
              <span className="text-accent">Esc</span> — close this help
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <div className="section-title text-accent/90">Data &amp; privacy</div>
          <p className="font-mono text-xs text-zinc-300 leading-relaxed">
            Everything (maps, missions, calibration) is stored locally in your
            browser. No server is contacted. Clearing site data wipes all saved missions.
          </p>
        </section>

        <div className="flex justify-end pt-1">
          <button className="btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
