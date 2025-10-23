import { type TiptapEditor } from "@hypr/tiptap/editor";
import { Loader2Icon } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "@hypr/utils";
import { useAITask } from "../../../../../../contexts/ai-task";
import { EnhancedEditor } from "./editor";
import { StreamingView } from "./streaming";

export const Enhanced = forwardRef<
  { editor: TiptapEditor | null },
  { sessionId: string }
>(({ sessionId }, ref) => {
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

  if (status === "generating") {
    return (
      <StreamingView
        text={streamedText}
        after={
          <div
            className={cn([
              "flex items-center justify-center w-full gap-3",
              "border border-neutral-200",
              "bg-neutral-50 rounded-lg py-2",
            ])}
          >
            <Loader2Icon className="w-4 h-4 animate-spin text-neutral-500" />
            <span className="text-xs text-neutral-500">Generating...</span>
          </div>
        }
      />
    );
  }

  return <EnhancedEditor ref={ref} sessionId={sessionId} />;
});
