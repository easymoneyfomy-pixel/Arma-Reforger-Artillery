import { useState, useCallback, useEffect } from "react";
import type { MapDef, Vec3 } from "../types";

export function useMapProjection(map: MapDef, size: { w: number; h: number }) {
  const getTransform = useCallback(() => {
    const cal = map.calibration;
    if (!cal) return null;

    if (cal.p3) {
      // 3-point Affine Transform: W = M * P + T
      // Solve for [m00 m01 tx; m10 m11 ty]
      const { p1, p2, p3 } = cal;
      const det = (p2.px.x - p1.px.x) * (p3.px.y - p1.px.y) - (p3.px.x - p1.px.x) * (p2.px.y - p1.px.y) || 1;
      
      const m00 = ((p2.world.x - p1.world.x) * (p3.px.y - p1.px.y) - (p3.world.x - p1.world.x) * (p2.px.y - p1.px.y)) / det;
      const m01 = ((p3.world.x - p1.world.x) * (p2.px.x - p1.px.x) - (p2.world.x - p1.world.x) * (p3.px.x - p1.px.x)) / det;
      const tx = p1.world.x - m00 * p1.px.x - m01 * p1.px.y;

      const m10 = ((p2.world.y - p1.world.y) * (p3.px.y - p1.px.y) - (p3.world.y - p1.world.y) * (p2.px.y - p1.px.y)) / det;
      const m11 = ((p3.world.y - p1.world.y) * (p2.px.x - p1.px.x) - (p2.world.y - p1.world.y) * (p3.px.x - p1.px.x)) / det;
      const ty = p1.world.y - m10 * p1.px.x - m11 * p1.px.y;

      // Inverse for worldToPx
      const idet = m00 * m11 - m01 * m10 || 1;
      const im00 = m11 / idet;
      const im01 = -m01 / idet;
      const itx = (m01 * ty - m11 * tx) / idet;
      const im10 = -m10 / idet;
      const im11 = m00 / idet;
      const ity = (m10 * tx - m00 * ty) / idet;

      return {
        toWorld: (p: { x: number; y: number }) => ({ x: m00 * p.x + m01 * p.y + tx, y: m10 * p.x + m11 * p.y + ty }),
        toPx: (w: { x: number; y: number }) => ({ x: im00 * w.x + im01 * w.y + itx, y: im10 * w.x + im11 * w.y + ity }),
      };
    } else {
      // 2-point Similarity Transform (allowing reflection for Y-flip)
      const { p1, p2 } = cal;
      const dpx = p2.px.x - p1.px.x;
      const dpy = p2.px.y - p1.px.y;
      const dwx = p2.world.x - p1.world.x;
      const dwy = p2.world.y - p1.world.y;
      
      const det = dpx * dpx + dpy * dpy || 1;
      // We assume standard map orientation (X right, Y up in world)
      // but image Y is down. This is a reflection.
      const a = (dwx * dpx - dwy * dpy) / det;
      const b = (dwy * dpx + dwx * dpy) / det;

      return {
        toWorld: (p: { x: number; y: number }) => {
          const dx = p.x - p1.px.x;
          const dy = p.y - p1.px.y;
          return {
            x: p1.world.x + a * dx + b * dy,
            y: p1.world.y + b * dx - a * dy,
          };
        },
        toPx: (w: { x: number; y: number }) => {
          const dx = w.x - p1.world.x;
          const dy = w.y - p1.world.y;
          const idet = a * a + b * b || 1;
          return {
            x: p1.px.x + (a * dx + b * dy) / idet,
            y: p1.px.y + (b * dx - a * dy) / idet,
          };
        }
      };
    }
  }, [map.calibration]);

  const worldToPx = useCallback((world: { x: number; y: number }) => {
    const transform = getTransform();
    if (transform) {
      const p = transform.toPx(world);
      return { x: (p.x / 1000) * size.w, y: (p.y / 1000) * size.h };
    }
    const fx = world.x / map.worldSizeM;
    const fy = world.y / map.worldSizeM;
    return { x: fx * size.w, y: (1 - fy) * size.h };
  }, [map, size, getTransform]);

  const pxToWorld = useCallback((px: { x: number; y: number }) => {
    const transform = getTransform();
    if (transform) {
      const lp = { x: (px.x / size.w) * 1000, y: (px.y / size.h) * 1000 };
      return transform.toWorld(lp);
    }
    const fx = px.x / size.w;
    const fy = px.y / size.h;
    return { x: fx * map.worldSizeM, y: (1 - fy) * map.worldSizeM };
  }, [map, size, getTransform]);

  const metersToPx = useCallback((anchor: { x: number; y: number }, meters: number) => {
    const a = worldToPx(anchor);
    const b = worldToPx({ x: anchor.x + meters, y: anchor.y });
    return Math.hypot(b.x - a.x, b.y - a.y);
  }, [worldToPx]);

  return { worldToPx, pxToWorld, metersToPx };
}
