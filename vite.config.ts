import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Repo name = "Arma-Reforger-Artillery". GitHub Pages serves it under
// https://<user>.github.io/Arma-Reforger-Artillery/, so the built asset URLs
// must be prefixed with that path. Override locally with VITE_BASE=/ if needed.
const base = process.env.VITE_BASE ?? "/Arma-Reforger-Artillery/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Arma Reforger Artillery FDC",
        short_name: "Arma FDC",
        description: "Tactical Fire Direction Control for Arma Reforger",
        theme_color: "#06070a",
        background_color: "#06070a",
        display: "standalone",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  server: { host: true, port: 5173 },
});

