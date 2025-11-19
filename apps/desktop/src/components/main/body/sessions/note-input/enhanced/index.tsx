import { forwardRef } from "react";

import { type TiptapEditor } from "@hypr/tiptap/editor";

import { useAITaskTask } from "../../../../../../hooks/useAITaskTask";
import { useLLMConnectionStatus } from "../../../../../../hooks/useLLMConnection";
import { createTaskId } from "../../../../../../store/zustand/ai-task/task-configs";
import { ConfigError } from "./config-error";
import { EnhancedEditor } from "./editor";
import { StreamingView } from "./streaming";

export const Enhanced = forwardRef<
  { editor: TiptapEditor | null },
  { sessionId: string; enhancedNoteId: string }
>(({ sessionId, enhancedNoteId }, ref) => {
  const taskId = createTaskId(enhancedNoteId, "enhance");
  const llmStatus = useLLMConnectionStatus();
  const { status } = useAITaskTask(taskId, "enhance");

  const isConfigError =
    llmStatus.status === "pending" ||
    (llmStatus.status === "error" &&
      (llmStatus.reason === "missing_config" ||
        llmStatus.reason === "unauthenticated"));

  if (status === "idle" && isConfigError) {
    return <ConfigError status={llmStatus} />;
  }

  if (status === "error") {
    return null;
  }

  if (status === "generating") {
    return <StreamingView enhancedNoteId={enhancedNoteId} />;
  }

  return (
    <EnhancedEditor
      ref={ref}
      sessionId={sessionId}
      enhancedNoteId={enhancedNoteId}
    />
  );
});
