import { Channel } from "@tauri-apps/api/core";
import { useScheduleTaskRun, useSetTask } from "tinytick/ui-react";

import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import type { SupportedSttModel } from "@hypr/plugin-local-stt";

import { checkForUpdate } from "./main/sidebar/profile/ota/task";

function isMacOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("macintosh") || ua.includes("mac os x");
}

const UPDATE_CHECK_TASK_ID = "checkForUpdate";
const UPDATE_CHECK_INTERVAL = 30 * 1000;

export const DOWNLOAD_MODEL_TASK_ID = "downloadModel";

const SYNC_CALENDARS_TASK_ID = "syncCalendars";
const SYNC_CALENDARS_INTERVAL = 10 * 60 * 1000;

const SYNC_EVENTS_TASK_ID = "syncEvents";
const SYNC_EVENTS_INTERVAL = 5 * 60 * 1000;

const downloadProgressCallbacks = new Map<string, (progress: number) => void>();

export function registerDownloadProgressCallback(
  model: SupportedSttModel,
  callback: (progress: number) => void,
) {
  downloadProgressCallbacks.set(model, callback);
}

export function unregisterDownloadProgressCallback(model: SupportedSttModel) {
  downloadProgressCallbacks.delete(model);
}

export function TaskManager() {
  useSetTask(UPDATE_CHECK_TASK_ID, async () => {
    await checkForUpdate();
  });

  useScheduleTaskRun(UPDATE_CHECK_TASK_ID, undefined, 0, {
    repeatDelay: UPDATE_CHECK_INTERVAL,
  });

  useSetTask(DOWNLOAD_MODEL_TASK_ID, async (arg?: string) => {
    if (!arg) {
      return;
    }

    const model = arg as SupportedSttModel;
    const channel = new Channel<number>();
    const progressCallback = downloadProgressCallbacks.get(model);

    if (progressCallback) {
      channel.onmessage = (progress: number) => {
        progressCallback(progress);
      };
    }

    await localSttCommands.downloadModel(model, channel);
  });

  useSetTask(SYNC_CALENDARS_TASK_ID, async () => {
    if (!isMacOS()) {
      return;
    }

    try {
      const { commands } = await import("@hypr/plugin-apple-calendar");
      const result = await commands.syncCalendars();
      if (result.status === "error") {
        console.error("Failed to sync calendars:", result.error);
      }
    } catch (error) {
      console.error("Failed to sync calendars:", error);
    }
  });

  useScheduleTaskRun(SYNC_CALENDARS_TASK_ID, undefined, 0, {
    repeatDelay: SYNC_CALENDARS_INTERVAL,
  });

  useSetTask(SYNC_EVENTS_TASK_ID, async () => {
    if (!isMacOS()) {
      return;
    }

    try {
      const { commands } = await import("@hypr/plugin-apple-calendar");
      const result = await commands.syncEvents();
      if (result.status === "error") {
        console.error("Failed to sync events:", result.error);
      }
    } catch (error) {
      console.error("Failed to sync events:", error);
    }
  });

  useScheduleTaskRun(SYNC_EVENTS_TASK_ID, undefined, 0, {
    repeatDelay: SYNC_EVENTS_INTERVAL,
  });

  return null;
}
