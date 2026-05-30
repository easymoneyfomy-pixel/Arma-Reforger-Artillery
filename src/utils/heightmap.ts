import type { MapDef } from "../types";

const heightmapCache = new Map<string, ImageData>();

export async function loadHeightmap(url: string): Promise<ImageData> {
  if (heightmapCache.has(url)) return heightmapCache.get(url)!;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height);
      heightmapCache.set(url, data);
      resolve(data);
    };
    img.onerror = () => reject(new Error("Could not load heightmap image"));
    img.src = url;
  });
}

export function getAltitude(map: MapDef, imageData: ImageData, worldX: number, worldY: number): number {
  const { width, height } = imageData;
  
  // Convert world coords to pixel coords
  // Assuming heightmap is a perfect square covering worldSizeM
  const fx = worldX / map.worldSizeM;
  const fy = 1 - (worldY / map.worldSizeM); // flip Y because world 0,0 is bottom-left, image 0,0 is top-left
  
  const px = Math.floor(fx * (width - 1));
  const py = Math.floor(fy * (height - 1));
  
  if (px < 0 || px >= width || py < 0 || py >= height) return 0;
  
  // Sample red channel (assuming grayscale or RGB heightmap)
  const idx = (py * width + px) * 4;
  const val = imageData.data[idx]; // 0-255
  
  const maxAlt = map.maxAltitude || 500; // default 500m if not specified
  return (val / 255) * maxAlt;
}
