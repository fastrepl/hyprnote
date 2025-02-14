import type { Config } from "tailwindcss";
import UI from "@hypr/ui/tailwind.config";
import Tiptap from "@hypr/tiptap/editor/tailwind.config";
import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
const config = {
  ...UI,
  content: [
    ...UI.content,
    ...Tiptap.content,
    "src/**/*.{js,ts,jsx,tsx}",
    "index.html",
  ],
  theme: {
    extend: {
      ...UI.theme?.extend,
      fontFamily: {
        "racing-sans": ['"Racing Sans One"', "cursive"],
      },
    },
  },
  plugins: [...UI.plugins, typography],
} satisfies Config;

export default config;
