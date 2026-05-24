/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Menlo",
          "Consolas",
          "ui-monospace",
          "monospace",
        ],
      },
      colors: {
        panel: "#0b0c0d",
        panelAlt: "#101214",
        line: "#1f2226",
        accent: "#d6ff3a",
        accentDim: "#7a9610",
        danger: "#e04646",
      },
    },
  },
  plugins: [],
};
