import type { Config } from "tailwindcss";

const config = {
  content: [
    "src/**/*.{js,ts,jsx,tsx}",
    "index.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        "racing-sans": ["Racing Sans One", "cursive"],
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
