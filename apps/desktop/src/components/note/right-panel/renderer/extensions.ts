export type ExtensionName =
  | "@hypr/extension-dino-game"
  | "@hypr/extension-summary"
  | "@hypr/extension-transcript"
  | "@hypr/extension-timer"
  | "@hypr/extension-clock";

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
    default:
      throw new Error(`Unknown extension: ${name}`);
  }
}
