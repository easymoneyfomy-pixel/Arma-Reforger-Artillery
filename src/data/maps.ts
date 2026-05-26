import type { MapDef } from "../types";
import everonImg from "../assets/maps/everon.jpg";
import arlandImg from "../assets/maps/arland.png";

// Built-in maps ship with stylized topographic images so they work out of the
// box — no manual upload required. Image paths are bundled via Vite so they
// also work under the GitHub Pages base path.
const maps: MapDef[] = [
  {
    id: "everon",
    name: "Everon",
    worldSizeM: 12800,
    image: everonImg,
    builtin: true,
  },
  {
    id: "arland",
    name: "Arland",
    worldSizeM: 4096,
    image: arlandImg,
    builtin: true,
  },
];

export default maps;
