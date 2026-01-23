import { relaunch as tauriRelaunch } from "@tauri-apps/plugin-process";

import { events as settingsEvents } from "@hypr/plugin-settings";
import { commands as store2Commands } from "@hypr/plugin-store2";

const saveHandlers = new Map<string, () => Promise<void>>();
let migrationInProgress = false;
let migrationListenerInitialized = false;

export function registerSaveHandler(id: string, handler: () => Promise<void>) {
  saveHandlers.set(id, handler);
  return () => {
    saveHandlers.delete(id);
  };
}

export function isMigrationInProgress(): boolean {
  return migrationInProgress;
}

export function setMigrationInProgress(value: boolean): void {
  migrationInProgress = value;
}

export function initMigrationListener(): void {
  if (migrationListenerInitialized) {
    return;
  }
  migrationListenerInitialized = true;
  settingsEvents.contentBaseMigrationStarted.listen(() => {
    migrationInProgress = true;
  });
}

export async function save(): Promise<void> {
  if (migrationInProgress) {
    console.info("[save] Skipping save during content-base migration");
    return;
  }

  await Promise.all([
    ...Array.from(saveHandlers.values()).map((handler) => handler()),
    store2Commands.save(),
  ]);
}

export async function relaunch(): Promise<void> {
  await save();
  await tauriRelaunch();
}
