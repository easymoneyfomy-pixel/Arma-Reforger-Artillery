const LICENSE_KEY_STORAGE = "ar_fdc_license_key";
const DEFAULT_SALT = "fdc_hud_secret_2026";

export interface LicenseInfo {
  userId: string;
  signature: string;
  key: string;
}

export function parseLicenseKey(key: string): LicenseInfo | null {
  const parts = key.trim().split("-");
  if (parts.length !== 2) return null;
  const [userId, signature] = parts;
  if (!userId || !signature) return null;
  return { userId, signature, key };
}

export async function verifyLicenseKey(key: string, salt: string = DEFAULT_SALT): Promise<boolean> {
  const parsed = parseLicenseKey(key);
  if (!parsed) return false;
  
  const { userId, signature } = parsed;
  try {
    const data = `${userId}:${salt}`;
    const msgUint8 = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    const expectedSig = hashHex.substring(0, 16);
    return expectedSig === signature;
  } catch (e) {
    return false;
  }
}

export function getSavedLicenseKey(): string {
  try {
    return localStorage.getItem(LICENSE_KEY_STORAGE) || "";
  } catch (e) {
    return "";
  }
}

export function saveLicenseKey(key: string): void {
  try {
    localStorage.setItem(LICENSE_KEY_STORAGE, key.trim());
  } catch (e) {
    // Ignore
  }
}

export function clearSavedLicenseKey(): void {
  try {
    localStorage.removeItem(LICENSE_KEY_STORAGE);
  } catch (e) {
    // Ignore
  }
}
