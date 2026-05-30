import type { Vec3 } from "../types";

export function generateShareUrl(
  weaponId: string,
  ammoId: string,
  chargeId: string,
  gun: Vec3,
  target: Vec3,
  mapId: string
): string {
  const params = new URLSearchParams();
  params.set("w", weaponId);
  params.set("a", ammoId);
  params.set("c", chargeId);
  params.set("gx", gun.x.toFixed(0));
  params.set("gy", gun.y.toFixed(0));
  params.set("gz", gun.z.toFixed(0));
  params.set("tx", target.x.toFixed(0));
  params.set("ty", target.y.toFixed(0));
  params.set("tz", target.z.toFixed(0));
  params.set("m", mapId);

  const url = new URL(window.location.href);
  url.search = params.toString();
  return url.toString();
}
