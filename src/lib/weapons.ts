import weaponsData from '../data/weapons.json';
import type { WeaponData, AmmoData, ChargeData } from '../types';

export const WEAPONS: WeaponData[] = weaponsData.weapons as WeaponData[];

export function getWeapon(id: string): WeaponData | undefined {
  return WEAPONS.find((w) => w.id === id);
}

export function getAmmo(weaponId: string, ammoId: string): AmmoData | undefined {
  return getWeapon(weaponId)?.ammo.find((a) => a.id === ammoId);
}

export function getCharge(weaponId: string, ammoId: string, chargeId: string): ChargeData | undefined {
  return getAmmo(weaponId, ammoId)?.charges.find((c) => c.id === chargeId);
}
