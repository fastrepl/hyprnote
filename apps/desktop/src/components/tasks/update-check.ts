import { useScheduleTaskRun, useSetTask } from "tinytick/ui-react";

import { checkForUpdate } from "../main/sidebar/profile/ota/task";

const TASK_ID = "checkForUpdate";
const INTERVAL = 30 * 1000;

export function useUpdateCheckTask() {
  useSetTask(TASK_ID, async () => {
    await checkForUpdate();
  });

  useScheduleTaskRun(TASK_ID, undefined, 0, {
    repeatDelay: INTERVAL,
  });
}
