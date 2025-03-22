export type ExtensionName =
  | "@hypr/extension-dino-game"
  | "@hypr/extension-summary"
  | "@hypr/extension-transcript"
  | "@hypr/extension-timer"
  | "@hypr/extension-clock"
  | "@hypr/extension-calculator";

export function importExtension(name: ExtensionName) {
  switch (name) {
    case "@hypr/extension-dino-game":
      return import("@hypr/extension-dino-game");
    case "@hypr/extension-summary":
      return import("@hypr/extension-summary");
    case "@hypr/extension-transcript":
      return import("@hypr/extension-transcript");
    case "@hypr/extension-timer":
      return import("@hypr/extension-timer");
    case "@hypr/extension-clock":
      return import("@hypr/extension-clock");
    case "@hypr/extension-calculator":
      return import("@hypr/extension-calculator");
    default:
      throw new Error(`Unknown extension: ${name}`);
  }
}

import calculatorConfig from "@hypr/extension-calculator/config.json";
import clockConfig from "@hypr/extension-clock/config.json";
import dinoGameConfig from "@hypr/extension-dino-game/config.json";
import summaryConfig from "@hypr/extension-summary/config.json";
import timerConfig from "@hypr/extension-timer/config.json";
import transcriptConfig from "@hypr/extension-transcript/config.json";

export const EXTENSION_CONFIGS = [
  calculatorConfig,
  clockConfig,
  dinoGameConfig,
  summaryConfig,
  timerConfig,
  transcriptConfig,
];
