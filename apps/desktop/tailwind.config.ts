import type { Config } from "tailwindcss";

const config = {
  content: ["src/**/*.{js,ts,jsx,tsx}", "index.html"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Lora", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      animation: {
        shimmer: "shimmer 1.5s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
