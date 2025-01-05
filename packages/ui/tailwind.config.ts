import path from "path";
import type { Config } from "tailwindcss";

// https://magicui.design/docs/components/shimmer-button
const shimmerButton = {
  animation: {
    "shimmer-slide":
      "shimmer-slide var(--speed) ease-in-out infinite alternate",
    "spin-around": "spin-around calc(var(--speed) * 2) infinite linear",
  },
  keyframes: {
    "spin-around": {
      "0%": {
        transform: "translateZ(0) rotate(0)",
      },
      "15%, 35%": {
        transform: "translateZ(0) rotate(90deg)",
      },
      "65%, 85%": {
        transform: "translateZ(0) rotate(270deg)",
      },
      "100%": {
        transform: "translateZ(0) rotate(360deg)",
      },
    },
    "shimmer-slide": {
      to: {
        transform: "translate(calc(100cqw - 100%), 0)",
      },
    },
  },
};

// https://magicui.design/docs/components/retro-grid
const retroGrid = {
  animation: {
    grid: "grid 15s linear infinite",
  },
  keyframes: {
    grid: {
      "0%": { transform: "translateY(-50%)" },
      "100%": { transform: "translateY(0)" },
    },
  },
};

const config = {
  content: [path.resolve(__dirname, "src/components/**/*.tsx")],
  theme: {
    extend: {
      animation: {
        ...shimmerButton.animation,
        ...retroGrid.animation,
      },
      keyframes: {
        ...shimmerButton.keyframes,
        ...retroGrid.keyframes,
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
