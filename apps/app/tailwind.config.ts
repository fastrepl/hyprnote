import type { Config } from "tailwindcss";
import UI from "@hypr/ui/tailwind.config";

const config = {
  ...UI,
  content: [...UI.content, "src/**/*.{js,ts,jsx,tsx}", "index.html"],
  theme: {
    extend: {
      ...UI.theme?.extend,
      fontFamily: {
        "racing-sans": ['"Racing Sans One"', "cursive"],
      },
    },
  },
} satisfies Config;

export default config;
