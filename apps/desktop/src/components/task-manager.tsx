import { Channel } from "@tauri-apps/api/core";
import { useScheduleTaskRun, useSetTask } from "tinytick/ui-react";

import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import type { SupportedSttModel } from "@hypr/plugin-local-stt";

import { checkForUpdate } from "./main/sidebar/profile/ota/task";

const UPDATE_CHECK_TASK_ID = "checkForUpdate";
const UPDATE_CHECK_INTERVAL = 30 * 1000;

export const DOWNLOAD_MODEL_TASK_ID = "downloadModel";

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
      channel.onmessage = (progress) => {
        progressCallback(progress);
      };
    }

    await localSttCommands.downloadModel(model, channel);
  });

  return null;
}
