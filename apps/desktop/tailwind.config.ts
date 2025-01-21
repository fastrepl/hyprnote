import type { Config } from "tailwindcss";
import UI from "@hypr/ui/tailwind.config";
import Tiptap from "@hypr/tiptap/editor/tailwind.config";

const config = {
  ...UI,
  content: [
    ...UI.content,
    ...Tiptap.content,
    "src/**/*.{js,ts,jsx,tsx}",
    "index.html",
  ],
  plugins: [...UI.plugins, require("@tailwindcss/typography")],
} satisfies Config;

export default config;
