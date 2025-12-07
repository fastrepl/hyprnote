import { relaunch as tauriRelaunch } from "@tauri-apps/plugin-process";

let saveHandler: (() => Promise<void>) | null = null;

export function registerSaveHandler(handler: () => Promise<void>) {
  saveHandler = handler;
  return () => {
    saveHandler = null;
  };
}

async function save(): Promise<void> {
  if (saveHandler) {
    await saveHandler();
  }
}

export async function relaunch(): Promise<void> {
  await save();
  await tauriRelaunch();
}
