import type { Config } from "tailwindcss";

const config = {
  content: ["src/**/*.{js,ts,jsx,tsx}", "index.html"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Lora", "Georgia", "serif"],
        sans: ["SF Pro", "system-ui", "-apple-system", "sans-serif"],
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "reveal-left": {
          "0%": { clipPath: "inset(0 100% 0 0)" },
          "100%": { clipPath: "inset(0 0 0 0)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s infinite",
        "reveal-left": "reveal-left 0.5s ease-out forwards",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
