import { useScheduleTaskRun, useSetTask } from "tinytick/ui-react";

import { checkForUpdate } from "./main/sidebar/profile/ota/task";

const UPDATE_CHECK_TASK_ID = "checkForUpdate";
const UPDATE_CHECK_INTERVAL = 30 * 1000;

export function TaskManager() {
  useSetTask(UPDATE_CHECK_TASK_ID, async () => {
    await checkForUpdate();
  });

  useScheduleTaskRun(UPDATE_CHECK_TASK_ID, undefined, 0, {
    repeatDelay: UPDATE_CHECK_INTERVAL,
  });

  return null;
}
