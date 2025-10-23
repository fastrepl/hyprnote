import { type TiptapEditor } from "@hypr/tiptap/editor";
import { forwardRef } from "react";

import { useAITask } from "../../../../../../contexts/ai-task";
import { StreamingView } from "./streaming";

export const Enhanced = forwardRef<
  { editor: TiptapEditor | null },
  { sessionId: string }
>(({ sessionId }, _ref) => {
  const taskId = `${sessionId}-enhance`;

  const { status, streamedText, error } = useAITask((state) => {
    const taskState = state.tasks.get(taskId);
    return {
      status: taskState?.status ?? "idle",
      streamedText: taskState?.streamedText ?? "",
      error: taskState?.error,
    };
  });

  if (status === "error" && error) {
    return <pre>{error.message}</pre>;
  }

  return <StreamingView text={streamedText} />;
});
