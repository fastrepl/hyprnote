import { useMemo } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";
import { useListener } from "../../../../contexts/listener";
import { useAITaskTask } from "../../../../hooks/useAITaskTask";
import { useSTTConnection } from "../../../../hooks/useSTTConnection";
import * as main from "../../../../store/tinybase/main";
import { createTaskId } from "../../../../store/zustand/ai-task/task-configs";
import type { Tab } from "../../../../store/zustand/tabs/schema";
import { type EditorView } from "../../../../store/zustand/tabs/schema";

export function useHasTranscript(sessionId: string): boolean {
  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );

  return !!transcriptIds && transcriptIds.length > 0;
}

export function useCurrentNoteTab(tab: Extract<Tab, { type: "sessions" }>): EditorView {
  const hasTranscript = useHasTranscript(tab.id);
  const isListenerActive = useListener((state) => (state.status !== "inactive") && state.sessionId === tab.id);

  return useMemo(
    () => {
      if (tab.state.editor) {
        return tab.state.editor as EditorView;
      }

      if (isListenerActive) {
        return "raw";
      }

      return hasTranscript ? "enhanced" : "raw";
    },
    [tab.state.editor, isListenerActive, hasTranscript],
  );
}

export function RecordingIcon({ disabled }: { disabled?: boolean }) {
  return (
    <div className="relative size-2">
      <div className="absolute inset-0 rounded-full bg-red-600"></div>
      <div
        className={cn([
          "absolute inset-0 rounded-full bg-red-300",
          disabled ? "bg-red-600" : "animate-ping",
        ])}
      >
      </div>
    </div>
  );
}

export function useListenButtonState(sessionId: string) {
  const active = useListener((state) => state.status !== "inactive" && state.sessionId === sessionId);

  const taskId = createTaskId(sessionId, "enhance");
  const { status } = useAITaskTask(taskId, "enhance");
  const generating = status === "generating";
  const sttConnection = useSTTConnection();

  const shouldRender = !active && !generating;
  const isDisabled = !sttConnection;
  const warningMessage = !sttConnection ? "Transcription model not available." : "";

  return {
    shouldRender,
    isDisabled,
    warningMessage,
  };
}

export function ActionableTooltipContent({
  message,
  action,
}: {
  message: string;
  action?: {
    label: string;
    handleClick: () => void;
  };
}) {
  return (
    <div className="flex flex-row items-center gap-3">
      <p className="text-xs">{message}</p>
      {action && (
        <Button
          size="sm"
          variant="outline"
          className="text-black"
          onClick={action.handleClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
