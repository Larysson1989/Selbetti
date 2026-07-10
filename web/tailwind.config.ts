import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#F4F7FC",
        panel: "#FFFFFF",
        "panel-border": "#E4E9F2",
        amber: "#F7B500",
        green: "#16A34A",
        red: "#DC2626",
        blue: "#1B3B8C",
        paper: "#1F2937",
        muted: "#6B7280",
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
