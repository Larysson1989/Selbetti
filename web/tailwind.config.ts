import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#10141A",
        panel: "#181D25",
        "panel-border": "#262D38",
        amber: "#F2A93B",
        green: "#3FBF83",
        red: "#E5484D",
        blue: "#6EA8FE",
        paper: "#EDEFF2",
        muted: "#8B93A1",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
