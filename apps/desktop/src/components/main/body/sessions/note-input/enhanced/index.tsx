import { type TiptapEditor } from "@hypr/tiptap/editor";
import { forwardRef } from "react";

import { useAITask } from "../../../../../../contexts/ai-task";
import { createTaskId } from "../../../../../../store/zustand/ai-task/task-configs";
import { getTaskState } from "../../../../../../store/zustand/ai-task/tasks";
import { EnhancedEditor } from "./editor";
import { StreamingView } from "./streaming";

export const Enhanced = forwardRef<
  { editor: TiptapEditor | null },
  { sessionId: string }
>(({ sessionId }, ref) => {
  const taskId = createTaskId(sessionId, "enhance");

  const { status, error } = useAITask((state) => {
    const taskState = getTaskState(state.tasks, taskId);
    return {
      status: taskState?.status ?? "idle",
      error: taskState?.error,
    };
  });

  if (status === "error" && error) {
    return <pre>{error.message}</pre>;
  }

  if (status === "generating") {
    return <StreamingView sessionId={sessionId} />;
  }

  return <EnhancedEditor ref={ref} sessionId={sessionId} />;
});
