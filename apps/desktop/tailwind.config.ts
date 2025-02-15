import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

import UI from "@hypr/ui/tailwind.config";
import Tiptap from "@hypr/tiptap/editor/tailwind.config";

import ExtensionLiveSummary from "@hypr/extension-live-summary/tailwind.config";

const config = {
  ...UI,
  content: [
    ...UI.content,
    ...Tiptap.content,
    ...ExtensionLiveSummary.content,
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
