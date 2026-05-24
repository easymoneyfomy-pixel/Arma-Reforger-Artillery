import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Repo name = "Arma-Reforger-Artillery". GitHub Pages serves it under
// https://<user>.github.io/Arma-Reforger-Artillery/, so the built asset URLs
// must be prefixed with that path. Override locally with VITE_BASE=/ if needed.
const base = process.env.VITE_BASE ?? "/Arma-Reforger-Artillery/";

export default defineConfig({
  base,
  plugins: [react()],
  server: { host: true, port: 5173 },
});
