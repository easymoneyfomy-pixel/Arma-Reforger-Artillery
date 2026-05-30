import { useState, useCallback, useEffect } from "react";
import type { MapDef, Vec3 } from "../types";

export function useMapProjection(map: MapDef, size: { w: number; h: number }) {
  const worldToPx = useCallback((world: { x: number; y: number }) => {
    const cal = map.calibration;
    if (cal) {
      const dwx = cal.p2.world.x - cal.p1.world.x;
      const dwy = cal.p2.world.y - cal.p1.world.y;
      const dpx = cal.p2.px.x - cal.p1.px.x;
      const dpy = cal.p2.px.y - cal.p1.px.y;
      const det = dpx * dpx + dpy * dpy || 1;

      // Similarity transform matrix M = [a -b; b a]
      // deltaW = M * deltaP
      const a = (dwx * dpx + dwy * dpy) / det;
      const b = (dwy * dpx - dwx * dpy) / det;

      // P = P1 + M^-1 * (W - W1)
      // M^-1 = (1/det_M) * [a b; -b a], where det_M = a^2 + b^2
      const detM = a * a + b * b || 1;
      const dxw = world.x - cal.p1.world.x;
      const dyw = world.y - cal.p1.world.y;
      
      const lpx = cal.p1.px.x + (a * dxw + b * dyw) / detM;
      const lpy = cal.p1.px.y + (-b * dxw + a * dyw) / detM;

      return { x: (lpx / 1000) * size.w, y: (lpy / 1000) * size.h };
    }
    const fx = world.x / map.worldSizeM;
    const fy = world.y / map.worldSizeM;
    return { x: fx * size.w, y: (1 - fy) * size.h };
  }, [map, size]);

  const pxToWorld = useCallback((px: { x: number; y: number }) => {
    const cal = map.calibration;
    if (cal) {
      const lpx = (px.x / size.w) * 1000;
      const lpy = (px.y / size.h) * 1000;
      
      const dpx = cal.p2.px.x - cal.p1.px.x;
      const dpy = cal.p2.px.y - cal.p1.px.y;
      const dwx = cal.p2.world.x - cal.p1.world.x;
      const dwy = cal.p2.world.y - cal.p1.world.y;
      const det = dpx * dpx + dpy * dpy || 1;

      const a = (dwx * dpx + dwy * dpy) / det;
      const b = (dwy * dpx - dwx * dpy) / det;

      const dxp = lpx - cal.p1.px.x;
      const dyp = lpy - cal.p1.px.y;

      return {
        x: cal.p1.world.x + a * dxp - b * dyp,
        y: cal.p1.world.y + b * dxp + a * dyp,
      };
    }
    const fx = px.x / size.w;
    const fy = px.y / size.h;
    return { x: fx * map.worldSizeM, y: (1 - fy) * map.worldSizeM };
  }, [map, size]);

  const metersToPx = useCallback((anchor: { x: number; y: number }, meters: number) => {
    const a = worldToPx(anchor);
    const b = worldToPx({ x: anchor.x + meters, y: anchor.y });
    return Math.hypot(b.x - a.x, b.y - a.y);
  }, [worldToPx]);

  return { worldToPx, pxToWorld, metersToPx };
}
