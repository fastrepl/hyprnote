import { forwardRef } from "react";

import { type TiptapEditor } from "@hypr/tiptap/editor";

import { useAITaskTask } from "../../../../../../hooks/useAITaskTask";
import { createTaskId } from "../../../../../../store/zustand/ai-task/task-configs";
import { EnhancedEditor } from "./editor";
import { StreamingView } from "./streaming";

export const Enhanced = forwardRef<
  { editor: TiptapEditor | null },
  { sessionId: string }
>(({ sessionId }, ref) => {
  const taskId = createTaskId(sessionId, "enhance");

  const { status } = useAITaskTask(taskId, "enhance");

  if (status === "error") {
    return null;
  }

  if (status === "generating") {
    return <StreamingView sessionId={sessionId} />;
  }

  return <EnhancedEditor ref={ref} sessionId={sessionId} />;
});
