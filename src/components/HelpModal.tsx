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

  const standardList = t('help.standardList', { returnObjects: true }) as string[];
  const premiumList = t('help.premiumList', { returnObjects: true }) as string[];

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#06070adc]/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-accentDim/40 shadow-[0_0_50px_rgba(214,255,58,0.1)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="bg-panelAlt/50 border-b border-line p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
            <svg width="150" height="150" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M50 5 L50 95 M5 50 L95 50" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="section-title text-xl text-accent tracking-[0.3em] font-bold flex items-center gap-3">
                <span className="inline-block w-3 h-3 rounded-full bg-accent animate-pulse shadow-[0_0_15px_rgba(214,255,58,0.8)]"></span>
                {t('help.title')}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mt-1.5 ml-6">
                {t('help.subtitle')}
              </div>
            </div>
            <button 
              className="btn border-accentDim/40 hover:bg-accentDim/10 text-[10px] px-5 py-2"
              onClick={onClose}
            >
              {t('help.close')}
            </button>
          </div>
        </div>

        <div className="p-8 space-y-10">
          {/* Quick Start Guide */}
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-line to-transparent"></div>
              <h3 className="font-mono text-xs font-bold text-accent/60 tracking-[0.4em] uppercase">{t('help.quickStart')}</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-line to-transparent"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Step 
                num="01" 
                title={t('help.step1')} 
                desc={t('help.step1Desc')} 
              />
              <Step 
                num="02" 
                title={t('help.step2')} 
                desc={t('help.step2Desc')} 
              />
              <Step 
                num="03" 
                title={t('help.step3')} 
                desc={t('help.step3Desc')} 
              />
            </div>
          </section>

          {/* Features Comparison */}
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-line to-transparent"></div>
              <h3 className="font-mono text-xs font-bold text-accent/60 tracking-[0.4em] uppercase">{t('help.features')}</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-line to-transparent"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Standard Features */}
              <div className="panel-alt p-5 space-y-4 border-line/50">
                <div className="flex items-center gap-2 border-b border-line pb-2">
                  <span className="text-zinc-400 text-lg">⚙️</span>
                  <span className="font-mono text-[11px] font-bold text-zinc-300 tracking-wider">{t('help.standard')}</span>
                </div>
                <ul className="space-y-2.5">
                  {standardList.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 group">
                      <span className="text-accent/40 font-mono text-[10px] mt-1 group-hover:text-accent transition-colors">▶</span>
                      <span className="font-mono text-[11px] text-zinc-400 group-hover:text-zinc-200 transition-colors leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Premium Features */}
              <div className="panel-alt p-5 space-y-4 border-amber-500/30 bg-amber-500/5 shadow-[0_0_30px_rgba(245,158,11,0.03)]">
                <div className="flex items-center gap-2 border-b border-amber-500/20 pb-2">
                  <span className="text-amber-400 text-lg">👑</span>
                  <span className="font-mono text-[11px] font-bold text-amber-400 tracking-wider">{t('help.premium')}</span>
                </div>
                <ul className="space-y-2.5">
                  {premiumList.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 group">
                      <span className="text-amber-500/40 font-mono text-[10px] mt-1 group-hover:text-amber-400 transition-colors">★</span>
                      <span className="font-mono text-[11px] text-zinc-400 group-hover:text-zinc-200 transition-colors leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Footer Info */}
          <div className="panel-alt bg-black/40 p-4 rounded-sm border-line/20 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="font-mono text-[10px] text-zinc-500 flex items-center gap-2">
              <span className="text-accent font-bold">PRO TIP:</span>
              Use the <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 text-[9px] mx-0.5">S</kbd> key to quickly swap Gun and Target positions.
            </div>
            <div className="flex gap-4">
              <a href="https://t.me/Arma_Artillery_Bot" target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-accent hover:underline flex items-center gap-1.5">
                <span>TELEGRAM BOT</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            </div>
          </div>
        </div>

        <div className="bg-panelAlt/30 border-t border-line p-6 flex justify-end">
          <button className="btn-primary px-10 py-3 text-sm font-bold shadow-[0_0_20px_rgba(214,255,58,0.1)]" onClick={onClose}>
            {t('help.acknowledge')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="panel-alt p-5 relative group border-line/40 bg-panelAlt/40">
      <div className="absolute -top-3 -left-3 w-8 h-8 flex items-center justify-center bg-accent text-black font-mono font-bold text-xs rounded-sm group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(214,255,58,0.3)]">
        {num}
      </div>
      <div className="mt-2 space-y-2">
        <h4 className="font-mono text-[11px] font-bold text-zinc-200 tracking-wider uppercase border-b border-line/30 pb-1.5">{title}</h4>
        <p className="font-mono text-[10px] text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
          {desc}
        </p>
      </div>
    </div>
  );
}
