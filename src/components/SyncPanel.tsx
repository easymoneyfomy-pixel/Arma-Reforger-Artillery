import { useState } from "react";
import { useTranslation } from "react-i18next";
import { InfoHint } from "./Tooltip";

type Props = {
  batteryId: string;
  onJoin: (id: string) => void;
  onLeave: () => void;
  isConnected: boolean;
  serverUrl: string;
  onUrlChange: (url: string) => void;
};

export default function SyncPanel({ batteryId, onJoin, onLeave, isConnected, serverUrl, onUrlChange }: Props) {
  const { t } = useTranslation();
  const [inputId, setInputId] = useState("");

  function handleJoin() {
    if (inputId.trim()) {
      onJoin(inputId.trim().toUpperCase());
      setInputId("");
    }
  }

  function changeUrl() {
    const next = prompt("Enter Sync Server URL (e.g. http://your-ip:3000):", serverUrl);
    if (next) onUrlChange(next);
  }

  return (
    <div className="panel p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-zinc-600 font-mono text-[10px] flex-shrink-0">NET:</span>
          <span className="section-title truncate">{t('sync.title')}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button 
              className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors" 
              onClick={changeUrl} 
              title="Change Sync Server URL"
            >
              ⚙️
            </button>
            <InfoHint
              width={280}
              text={t('sync.help')}
            />
          </div>
        </div>
        <div className={`flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 border ${isConnected ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-line bg-panelAlt/50 text-zinc-500'} text-[8px] font-mono tracking-widest rounded-sm`}>
          <span className={`w-1 h-1 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
          {isConnected ? t('sync.connected') : t('sync.disconnected')}
        </div>
      </div>

      {!isConnected ? (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder={t('sync.idPlaceholder')}
              className="field flex-1 text-[10px] font-mono uppercase"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <button
              className="btn-primary !py-1 !px-4 !text-[10px]"
              onClick={handleJoin}
              disabled={!inputId.trim()}
            >
              {t('sync.join').toUpperCase()}
            </button>
          </div>
          <div className="text-[9px] text-zinc-500 font-mono leading-tight">
            Ask your battery commander for the Room ID.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="panel-alt p-2 flex items-center justify-between bg-emerald-500/5 border-emerald-500/20">
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-500 uppercase">{t('sync.label')}</span>
              <span className="font-mono text-sm text-emerald-400 font-bold tracking-widest">{batteryId}</span>
            </div>
            <button
              className="btn border-red-500/40 text-red-400 hover:bg-red-500/10 !py-1 !px-3 !text-[10px]"
              onClick={onLeave}
            >
              {t('sync.leave').toUpperCase()}
            </button>
          </div>
          <div className="text-[9px] text-emerald-500/70 font-mono animate-pulse">
            ● Real-time uplink active
          </div>
        </div>
      )}
    </div>
  );
}
