import type { Config } from "tailwindcss";

const config = {
  content: ["src/**/*.{js,ts,jsx,tsx}", "index.html"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Lora", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
