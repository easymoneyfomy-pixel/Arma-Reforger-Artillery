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
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setError("Invalid license key! Check your ID and signature format (ID-HASH).");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#06070adc]/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-md p-6 space-y-5 border-accentDim/40 shadow-[0_0_30px_rgba(214,255,58,0.06)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-lg">👑</span>
            <div className="section-title text-sm tracking-[0.2em] font-semibold">
              FDC LICENSE CONTROL
            </div>
          </div>
          <button
            className="btn border-zinc-700 hover:bg-zinc-800 text-[10px] px-3 py-1"
            onClick={onClose}
          >
            [ ESC ]
          </button>
        </div>

        {isPremium ? (
          /* Active Premium State */
          <div className="space-y-4 font-mono text-xs text-zinc-300">
            <div className="bg-amber-400/5 border border-amber-400/20 p-4 rounded-sm space-y-2">
              <div className="text-amber-400 font-semibold text-center tracking-wider uppercase">
                👑 PREMIUM HUD ACTIVE
              </div>
<p className="text-zinc-400 text-[11px] text-center leading-relaxed">
                 All features unlocked: modded howitzers, custom maps, wind correction, CEP circles, and preset landmarks.
               </p>
            </div>

            <div className="space-y-1">
              <span className="text-zinc-500 uppercase text-[10px]">Active License:</span>
              <div className="bg-black/30 border border-line/40 p-2 text-center rounded-sm break-all font-mono text-accent text-[11px]">
                {licenseKey}
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-2">
              <button
                className="btn border-red-500/40 text-red-400 hover:bg-red-500/10 px-4 py-2 flex-1"
                onClick={() => {
                  onDeactivate();
                  onClose();
                }}
              >
                Deactivate License
              </button>
              <button className="btn-primary px-5 py-2 flex-1" onClick={onClose}>
                Keep Premium
              </button>
            </div>
          </div>
        ) : (
          /* Locked / Free State */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 font-mono text-xs text-zinc-400 leading-relaxed">
<p>
                 You are currently running the <strong className="text-zinc-300">Free Vanilla Edition</strong>.
                 <br />Built-in maps (Everon, Arland) and vanilla weapons work without restrictions.
               </p>
              <div className="bg-black/25 border border-line/30 p-3 rounded-sm text-[11px] space-y-1">
                <div className="text-zinc-300 font-semibold uppercase tracking-wider text-[10px] mb-1">
                  🔒 Premium Features Locked:
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="text-red-400">✕</span> Custom Map Uploads
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="text-red-400">✕</span> Map Calibration
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="text-red-400">✕</span> Community Modded Weapons (Howitzers)
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="text-red-400">✕</span> MET Wind Correction Panel
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="text-red-400">✕</span> CEP Target Dispersion Circle
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="text-red-400">✕</span> Combat Preset Landmark Manager
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-zinc-300 font-semibold">How to obtain a key:</span>
                <ol className="list-decimal pl-4 text-[11px] space-y-1">
                  <li>
                    Start our Telegram Bot:{" "}
                    <a
                      href="https://t.me/Arma_Artillery_Bot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline hover:text-accent/80"
                    >
                      @Arma_Artillery_Bot
                    </a>
                  </li>
                  <li>Request access from the Administrator.</li>
                  <li>
                    Once approved, type <code className="text-accent">/license</code> in the bot, or simply run the Web-HUD directly from Telegram to log in automatically.
                  </li>
                </ol>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase text-zinc-400">
                Activation License Key
              </label>
              <input
                type="text"
                placeholder="e.g. 12345678-abcdef0123"
                className="input w-full font-mono text-xs tracking-wider"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded-sm font-mono text-[11px] text-center">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-accentDim/10 border border-accent/30 text-accent p-2.5 rounded-sm font-mono text-[11px] text-center">
                ✓ Premium features successfully unlocked!
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-2.5 text-xs font-semibold uppercase tracking-widest disabled:opacity-50"
              disabled={loading || success}
            >
              {loading ? "Validating Key..." : "Activate Premium HUD"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
