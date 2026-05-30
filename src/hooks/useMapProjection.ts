import { useState, useCallback, useEffect } from "react";
import type { MapDef, Vec3 } from "../types";

export function useMapProjection(map: MapDef, size: { w: number; h: number }) {
  const worldToPx = useCallback((world: { x: number; y: number }) => {
    const cal = map.calibration;
    if (cal) {
      const dx = cal.p2.world.x - cal.p1.world.x || 1;
      const dy = cal.p2.world.y - cal.p1.world.y || 1;
      const fx = (world.x - cal.p1.world.x) / dx;
      const fy = (world.y - cal.p1.world.y) / dy;
      const px = cal.p1.px.x + fx * (cal.p2.px.x - cal.p1.px.x);
      const py = cal.p1.px.y + fy * (cal.p2.px.y - cal.p1.px.y);
      return { x: (px / 1000) * size.w, y: (py / 1000) * size.h };
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
      const dxp = cal.p2.px.x - cal.p1.px.x || 1;
      const dyp = cal.p2.px.y - cal.p1.px.y || 1;
      const fx = (lpx - cal.p1.px.x) / dxp;
      const fy = (lpy - cal.p1.px.y) / dyp;
      return {
        x: cal.p1.world.x + fx * (cal.p2.world.x - cal.p1.world.x),
        y: cal.p1.world.y + fy * (cal.p2.world.y - cal.p1.world.y),
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
