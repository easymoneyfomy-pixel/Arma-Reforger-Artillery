import { useState, useEffect } from "react";
import type { MapDef } from "../types";
import { loadHeightmap, getAltitude } from "../utils/heightmap";

export function useHeightmap(map: MapDef) {
  const [imageData, setImageData] = useState<ImageData | null>(null);

  useEffect(() => {
    if (map.heightmap) {
      loadHeightmap(map.heightmap)
        .then(setImageData)
        .catch(() => setImageData(null));
    } else {
      setImageData(null);
    }
  }, [map.heightmap]);

  const getAltitudeAt = (worldX: number, worldY: number) => {
    if (!imageData) return null;
    return getAltitude(map, imageData, worldX, worldY);
  };

  return { getAltitudeAt, hasHeightmap: !!imageData };
}
