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
      colors: {
        color1: "#FBFBFB",
        color2: "#F4F4F4",
        color3: "#8e8e8e",
        color4: "#484848",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
