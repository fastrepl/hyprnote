export * from "./bindings.gen";

import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

type UUID = `${string}-${string}-${string}-${string}-${string}`;

export type WindowLabel = "main" | `note-${UUID}` | "calendar" | "settings";

export const getCurrentWebviewWindowLabel = () => {
  const window = getCurrentWebviewWindow();
  return window.label as WindowLabel;
};

export const init = () => {
  document.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener("dragenter", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
};
