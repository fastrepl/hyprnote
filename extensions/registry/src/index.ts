export const ExtensionNames = [
  "@hypr/extension-transcript",
  "@hypr/extension-twenty",
  // "@hypr/extension-summary",
  "@hypr/extension-dino-game",
  "@hypr/extension-timer",
] as const;

export type ExtensionName = typeof ExtensionNames[number];

export function importExtension(name: ExtensionName) {
  switch (name) {
    case "@hypr/extension-dino-game":
      return import("@hypr/extension-dino-game");
    // case "@hypr/extension-summary":
    //   return import("@hypr/extension-summary");
    case "@hypr/extension-transcript":
      return import("@hypr/extension-transcript");
    case "@hypr/extension-timer":
      return import("@hypr/extension-timer");
    case "@hypr/extension-twenty":
      return import("@hypr/extension-twenty");
    default:
      throw new Error(`Unknown extension: ${name}`);
  }
}

import dinoGameConfig from "@hypr/extension-dino-game/config.json";
// import summaryConfig from "@hypr/extension-summary/config.json";
import timerConfig from "@hypr/extension-timer/config.json";
import transcriptConfig from "@hypr/extension-transcript/config.json";
import twentyConfig from "@hypr/extension-twenty/config.json";

export const EXTENSION_CONFIGS = [
  dinoGameConfig,
  // summaryConfig,
  timerConfig,
  transcriptConfig,
  twentyConfig,
];
