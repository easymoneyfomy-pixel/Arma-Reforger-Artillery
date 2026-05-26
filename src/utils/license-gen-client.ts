import { useCallback } from "react";

const SALT = "fdc_hud_secret_2026";

export default function useLicenseGenerator() {
  return useCallback(async (userId: string): Promise<string> => {
    const data = `${userId}:${SALT}`;
    const msgUint8 = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    return `${userId}-${hashHex.substring(0, 16)}`;
  }, []);
}

export function validateUserId(userId: string): boolean {
  return /^[a-zA-Z0-9_-]{3,32}$/.test(userId);
}