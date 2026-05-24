import mapsJson from '../data/maps.json';
import type { CustomMapCalibration, MapData, Point2D } from '../types';

export const BASE_MAPS: MapData[] = mapsJson.maps as MapData[];

/**
 * Convert world (meters, origin bottom-left, +Y north) to pixel coords on the map image.
 */
export function worldToPx(map: MapData, p: Point2D): Point2D {
  if (map.calibration) {
    return calibratedWorldToPx(map.calibration, p);
  }
  const s = map.worldSize_m || 1;
  return {
    x: (p.x / s) * map.imgWidth,
    y: map.imgHeight - (p.y / s) * map.imgHeight,
  };
}

export function pxToWorld(map: MapData, p: Point2D): Point2D {
  if (map.calibration) {
    return calibratedPxToWorld(map.calibration, p);
  }
  const s = map.worldSize_m || 1;
  return {
    x: (p.x / map.imgWidth) * s,
    y: ((map.imgHeight - p.y) / map.imgHeight) * s,
  };
}

/**
 * Calibrated maps use two reference points to derive a 2-D affine map between
 * pixels and meters. We solve for scale-X / scale-Y independently (assuming
 * the image is axis-aligned to the world grid — which is the case for every
 * standard Reforger top-down minimap).
 *
 * px -> world:  wx = (px - px0) * sx + wx0
 *               wy = (py - py0) * sy + wy0
 */
function calibratedPxToWorld(cal: CustomMapCalibration, p: Point2D): Point2D {
  const dpx = cal.p2.px - cal.p1.px || 1;
  const dpy = cal.p2.py - cal.p1.py || 1;
  const sx = (cal.p2.wx - cal.p1.wx) / dpx;
  const sy = (cal.p2.wy - cal.p1.wy) / dpy;
  return {
    x: cal.p1.wx + (p.x - cal.p1.px) * sx,
    y: cal.p1.wy + (p.y - cal.p1.py) * sy,
  };
}

function calibratedWorldToPx(cal: CustomMapCalibration, p: Point2D): Point2D {
  const dwx = cal.p2.wx - cal.p1.wx || 1;
  const dwy = cal.p2.wy - cal.p1.wy || 1;
  const sx = (cal.p2.px - cal.p1.px) / dwx;
  const sy = (cal.p2.py - cal.p1.py) / dwy;
  return {
    x: cal.p1.px + (p.x - cal.p1.wx) * sx,
    y: cal.p1.py + (p.y - cal.p1.wy) * sy,
  };
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function loadImageDims(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}
