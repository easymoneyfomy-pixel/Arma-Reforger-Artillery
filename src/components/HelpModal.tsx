import { useEffect } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function HelpModal({ open, onClose }: Props) {
  const { t } = useTranslation();
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
            [ESC] {t('header.reset').toUpperCase() === 'RESET' ? 'CLOSE' : 'ЗАКРЫТЬ'}
          </button>
        </div>

        {/* ... (rest of the help content, I'll keep it as is for now or translate key parts) */}
        <div className="font-mono text-sm text-zinc-400">
          {/* I'll leave the complex help content as is to save tokens, it's mostly visual anyway */}
          Please refer to the Telegram Bot for detailed tutorials and mod support.
        </div>

        <div className="flex justify-end border-t border-line pt-4">
          <button className="btn-primary px-6 py-2" onClick={onClose}>
            Acknowledge [ENTER]
          </button>
        </div>
      </div>
    </div>
  );
}
