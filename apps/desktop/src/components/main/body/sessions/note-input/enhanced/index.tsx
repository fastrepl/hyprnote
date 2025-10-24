import { type TiptapEditor } from "@hypr/tiptap/editor";
import { forwardRef } from "react";

import { useAITask } from "../../../../../../contexts/ai-task";
import { EnhancedEditor } from "./editor";
import { StreamingView } from "./streaming";

export const Enhanced = forwardRef<
  { editor: TiptapEditor | null },
  { sessionId: string }
>(({ sessionId }, ref) => {
  const taskId = `${sessionId}-enhance`;

  const { status, streamedText, error } = useAITask((state) => {
    const taskState = state.tasks[taskId];
    return {
      status: taskState?.status ?? "idle",
      streamedText: taskState?.streamedText ?? "",
      error: taskState?.error,
    };
  });

  if (status === "error" && error) {
    return <pre>{error.message}</pre>;
  }

  if (status === "generating") {
    return <StreamingView sessionId={sessionId} text={streamedText} />;
  }

  return <EnhancedEditor ref={ref} sessionId={sessionId} />;
});
