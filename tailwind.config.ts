import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        hand: ["var(--font-hand)", "cursive"],
      },
      colors: {
        ink: { 950: "#0b0d17", 900: "#11142a", 800: "#181c38", 700: "#232850" },
      },
      boxShadow: {
        postit: "0 1px 1px rgba(0,0,0,.15), 0 10px 20px -8px rgba(0,0,0,.45)",
        lift: "0 25px 50px -12px rgba(0,0,0,.6)",
      },
      keyframes: {
        pop: { "0%": { transform: "scale(.9)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
      },
      animation: { pop: "pop .18s ease-out" },
    },
  },
  plugins: [],
};
export default config;
