import { useCallback } from "react";

const SALT = "fdc_hud_secret_2026";

export function generateLicenseKeyClient(userId: string): Promise<string> {
  const data = `${userId}:${SALT}`;
  const msgUint8 = new TextEncoder().encode(data);
  return crypto.subtle.digest("SHA-256", msgUint8).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    return `${userId}-${hashHex.substring(0, 16)}`;
  });
}