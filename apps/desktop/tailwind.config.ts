import type { Config } from "tailwindcss";

import ExtensionDinoGame from "@hypr/extension-dino-game/tailwind.config";
import ExtensionSummary from "@hypr/extension-summary/tailwind.config";
import ExtensionTimer from "@hypr/extension-timer/tailwind.config";
import ExtensionTranscript from "@hypr/extension-transcript/tailwind.config";
import ExtensionTwenty from "@hypr/extension-twenty/tailwind.config";

const config = {
  // Use class strategy for dark mode
  darkMode: ["class"],
  content: [
    ...ExtensionSummary.content,
    ...ExtensionTranscript.content,
    ...ExtensionDinoGame.content,
    ...ExtensionTimer.content,
    ...ExtensionTwenty.content,
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
