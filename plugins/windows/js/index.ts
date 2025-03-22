export * from "./bindings.gen";

import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

type UUID = `${string}-${string}-${string}-${string}-${string}`;

export type WindowLabel = "main" | `note-${UUID}` | "calendar" | "settings";

export const getCurrentWebviewWindowLabel = () => {
  const window = getCurrentWebviewWindow();
  return window.label as WindowLabel;
};
