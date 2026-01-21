import { relaunch as tauriRelaunch } from "@tauri-apps/plugin-process";

import { commands as store2Commands } from "@hypr/plugin-store2";

const saveHandlers = new Map<string, () => Promise<void>>();

export function registerSaveHandler(id: string, handler: () => Promise<void>) {
  saveHandlers.set(id, handler);
  return () => {
    saveHandlers.delete(id);
  };
}

export async function save(): Promise<void> {
  await Promise.all([
    ...Array.from(saveHandlers.values()).map((handler) => handler()),
    store2Commands.save(),
  ]);
}

export async function relaunch(): Promise<void> {
  await save();
  await tauriRelaunch();
}
