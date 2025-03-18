export type ExtensionName = "@hypr/extension-dino-game" | "@hypr/extension-summary" | "@hypr/extension-transcript";

export function importExtension(name: ExtensionName) {
  switch (name) {
    case "@hypr/extension-dino-game":
      return import("@hypr/extension-dino-game");
    case "@hypr/extension-summary":
      return import("@hypr/extension-summary");
    case "@hypr/extension-transcript":
      return import("@hypr/extension-transcript");
    default:
      throw new Error("Unreachable");
  }
}
