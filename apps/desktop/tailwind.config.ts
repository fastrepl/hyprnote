import type { Config } from "tailwindcss";

import ExtensionCalculator from "@hypr/extension-calculator/tailwind.config";
import ExtensionClock from "@hypr/extension-clock/tailwind.config";
import ExtensionDinoGame from "@hypr/extension-dino-game/tailwind.config";
import ExtensionSummary from "@hypr/extension-summary/tailwind.config";
import ExtensionTimer from "@hypr/extension-timer/tailwind.config";
import ExtensionTranscript from "@hypr/extension-transcript/tailwind.config";
import ExtensionTwenty from "@hypr/extension-twenty/tailwind.config";

const config = {
  content: [
    ...ExtensionCalculator.content,
    ...ExtensionSummary.content,
    ...ExtensionTranscript.content,
    ...ExtensionClock.content,
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
