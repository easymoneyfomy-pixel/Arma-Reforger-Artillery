import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  isPremium: boolean;
  licenseKey: string;
  onActivate: (key: string) => Promise<boolean>;
  onDeactivate: () => void;
};

export default function LicenseModal({
  open,
  onClose,
  isPremium,
  licenseKey,
  onActivate,
  onDeactivate,
}: Props) {
  const [inputKey, setInputKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setInputKey("");
    setError("");
    setSuccess(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!inputKey.trim()) {
      setError("Please enter a license key.");
      return;
    }

    setLoading(true);
    const ok = await onActivate(inputKey);
    setLoading(false);

    if (ok) {
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } else {
      setError("Invalid license key! Check your ID and signature format (ID-HASH).");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#06070adc]/80 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="panel w-full max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6 space-y-4 border-accentDim/40 shadow-[0_0_30px_rgba(214,255,58,0.06)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-lg">👑</span>
            <div className="section-title text-sm tracking-[0.2em] font-semibold">FDC LICENSE CONTROL</div>
          </div>
          <button className="btn border-zinc-700 hover:bg-zinc-800 text-[10px] px-3 py-1" onClick={onClose}>[ ESC ]</button>
        </div>

        {isPremium ? (
          <div className="space-y-4 font-mono text-xs text-zinc-300">
            <div className="bg-amber-400/5 border border-amber-400/20 p-4 rounded-sm space-y-2">
              <div className="text-amber-400 font-semibold text-center tracking-wider uppercase">👑 PREMIUM HUD ACTIVE</div>
              <p className="text-zinc-400 text-[11px] text-center leading-relaxed">All features unlocked: modded howitzers, custom maps, wind correction, CEP circles, and preset landmarks.</p>
            </div>
            <div className="space-y-1">
              <span className="text-zinc-500 uppercase text-[10px]">Active License:</span>
              <div className="bg-black/30 border border-line/40 p-2 text-center rounded-sm break-all font-mono text-accent text-[11px]">{licenseKey}</div>
            </div>
            <div className="flex gap-3 pt-2">
              <button className="btn border-red-500/40 text-red-400 hover:bg-red-500/10 px-4 py-2 flex-1" onClick={() => { onDeactivate(); onClose(); }}>Deactivate License</button>
              <button className="btn-primary px-5 py-2 flex-1" onClick={onClose}>Keep Premium</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs font-mono text-zinc-400"><strong className="text-zinc-300">Free Vanilla</strong>: Everon/Arland maps + M252/2B14/M120 unrestricted.</p>
            <div className="text-[10px] font-mono text-zinc-400 space-y-1">
              <div className="text-amber-400 font-semibold">🔒 Locked Features:</div>
              <div>Custom Maps • Map Calibration • Modded Weapons • Wind Correction • CEP • Presets</div>
            </div>
            <div className="text-[10px] font-mono text-zinc-300 space-y-1">
              <div><b>Get key:</b> @Arma_Artillery_Bot → /license</div>
              <div className="space-y-1.5">
                <label className="uppercase text-zinc-400 block">License Key</label>
                <input type="text" inputMode="text" autoComplete="one-time-code" placeholder="e.g. 12345678-abcdef0123" className="input w-full font-mono text-xs tracking-wider" value={inputKey} onChange={(e) => setInputKey(e.target.value)} disabled={loading} onFocus={(e) => { setTimeout(() => { e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300); }} />
              </div>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-2 rounded-sm font-mono text-[11px] text-center">{error}</div>}
            {success && <div className="bg-accentDim/10 border border-accent/30 text-accent p-2 rounded-sm font-mono text-[11px] text-center">✓ Activated!</div>}
            <button type="submit" className="btn-primary w-full py-2 text-xs font-semibold uppercase" disabled={loading || success}>{loading ? "Validating..." : "Activate Premium"}</button>
          </form>
        )}
      </div>
    </div>
  );
}