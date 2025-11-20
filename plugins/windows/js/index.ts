import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export * from "./bindings.gen";

type UUID = `${string}-${string}-${string}-${string}-${string}`;

export type WindowLabel = "main" | `note-${UUID}` | "calendar" | "settings";

export const getCurrentWebviewWindowLabel = () => {
  const window = getCurrentWebviewWindow();
  return window.label as WindowLabel;
};

export const init = () => {
  const allowDropAttribute = "[data-allow-file-drop='true']";
  const shouldAllow = (event: DragEvent) => {
    if (!(event.target instanceof Element)) {
      return false;
    }
    return Boolean(event.target.closest(allowDropAttribute));
  };

  const preventUnlessAllowed = (event: DragEvent) => {
    const allowed = shouldAllow(event);

    if (event.type === "dragover" || event.type === "drop") {
      // Always prevent the browser's default "open file in this window"
      // behaviour so the webview doesn't navigate away.
      event.preventDefault();

      // Outside allowed regions we also stop propagation so nothing else
      // (including Tiptap) sees the event.
      if (!allowed) {
        event.stopPropagation();
      }
      return;
    }

    // For dragenter / dragleave we only block events outside allowed areas.
    if (!allowed) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  document.addEventListener("dragover", preventUnlessAllowed);
  document.addEventListener("drop", preventUnlessAllowed);
  document.addEventListener("dragenter", preventUnlessAllowed);
  document.addEventListener("dragleave", preventUnlessAllowed);
};
