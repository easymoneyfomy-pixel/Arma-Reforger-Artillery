import { useState } from "react";
import { InfoHint } from "./Tooltip";
import { saveLicenseKey } from "../utils/license";

const SALT = "fdc_hud_secret_2026";

export default function AdminPanel() {
  const [userId, setUserId] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [copied, setCopied] = useState(false);

  async function generateKey() {
    if (!userId.trim()) return;
    const data = `${userId}:${SALT}`;
    const msgUint8 = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    const key = `${userId}-${hashHex.substring(0, 16)}`;
    setLicenseKey(key);
  }

  async function copyKey() {
    if (!licenseKey) return;
    await navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function useKey() {
    if (licenseKey) {
      saveLicenseKey(licenseKey);
      location.reload();
    }
  }

  return (
    <div className="panel p-3 space-y-2 border-amber-400/30">
      <div className="flex items-center justify-between">
        <span className="section-title"><span className="text-zinc-600 mr-1">ADMIN:</span>License Generator</span>
        <InfoHint
          width={260}
          text={
            <>
              Admin utility for generating license keys.
              <br /><br />
              <b>User ID</b> can be Telegram ID or username.
              <>The key format is <code>USERID-HASH</code></>
            </>
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="field font-mono text-xs"
          placeholder="User ID (Telegram ID)"
          value={userId}
          onChange={e => setUserId(e.target.value)}
        />
        <button className="btn-primary" onClick={generateKey} disabled={!userId.trim()}>
          Generate Key
        </button>
      </div>
      {licenseKey && (
        <div className="font-mono text-xs bg-black/30 border border-accent/40 p-2 rounded-sm break-all text-accent flex items-center justify-between gap-2">
          <span className="truncate">{licenseKey}</span>
          <div className="flex gap-1">
            <button className="btn !py-0 !px-1 !text-[9px]" onClick={copyKey}>{copied ? "Copied" : "Copy"}</button>
            <button className="btn-primary !py-0 !px-1 !text-[9px]" onClick={useKey}>Use</button>
          </div>
        </div>
      )}
    </div>
  );
}