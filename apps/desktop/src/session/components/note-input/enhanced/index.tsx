import { Trans } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import type { EditorView } from "prosemirror-view";
import { forwardRef } from "react";

import type { NoteEditorRef } from "@anlg/editor/note";
import { Button } from "@anlg/ui/components/ui/button";
import { defaultSummaryDocumentId } from "@anlg/utils/session";

import { ConfigError } from "./config-error";
import { EnhancedEditor } from "./editor";
import { EnhanceError } from "./enhance-error";
import { StreamingView } from "./streaming";

import { useAITaskTask } from "~/ai/hooks";
import { useLLMConnectionStatus } from "~/ai/hooks";
import {
  isMainAITaskHostWindow,
  requestMainEnhance,
} from "~/ai/task-window-sync";
import { getEnhancerService } from "~/services/enhancer";
import { hasStoredNoteContent } from "~/session/components/shared";
import { shouldShowEmptySummaryConfigError } from "~/session/enhance-config";
import { useEnhancedNote } from "~/session/queries";
import { createTaskId } from "~/store/zustand/ai-task/task-configs";

export const Enhanced = forwardRef<
  NoteEditorRef,
  {
    sessionId: string;
    sessionTitle: string;
    enhancedNoteId: string;
    onNavigateToTitle?: (pixelWidth?: number) => void;
    onViewReady?: (view: EditorView) => void;
    onViewDisposed?: (view: EditorView) => void;
  }
>(
  (
    {
      sessionId,
      sessionTitle,
      enhancedNoteId,
      onNavigateToTitle,
      onViewReady,
      onViewDisposed,
    },
    ref,
  ) => {
    const taskId = createTaskId(enhancedNoteId, "enhance");
    const llmStatus = useLLMConnectionStatus();
    const { status, error, streamedText } = useAITaskTask(taskId, "enhance");
    const enhancedNote = useEnhancedNote(enhancedNoteId);
    const content = enhancedNote?.content;

    const hasContent = hasStoredNoteContent(content);
    const isAwaitingPersistedContent =
      status === "success" && streamedText.trim().length > 0 && !hasContent;
    const showStreaming = status === "generating" || isAwaitingPersistedContent;
    const isConfigError = shouldShowEmptySummaryConfigError(llmStatus);

    if (status === "error") {
      return (
        <EnhanceError
          sessionId={sessionId}
          enhancedNoteId={enhancedNoteId}
          error={error}
          isUnauthenticated={
            llmStatus.status === "error" &&
            llmStatus.reason === "unauthenticated"
          }
        />
      );
    }

    if (!enhancedNote) {
      return showStreaming ? (
        <StreamingView
          sessionId={sessionId}
          sessionTitle={sessionTitle}
          enhancedNoteId={enhancedNoteId}
        />
      ) : enhancedNoteId === defaultSummaryDocumentId(sessionId) ? (
        isConfigError ? (
          <ConfigError />
        ) : (
          <EmptySummary sessionId={sessionId} />
        )
      ) : null;
    }

    if (status === "idle" && isConfigError && !hasContent) {
      return <ConfigError />;
    }

    if (showStreaming) {
      return (
        <StreamingView
          sessionId={sessionId}
          sessionTitle={sessionTitle}
          enhancedNoteId={enhancedNoteId}
        />
      );
    }

    return (
      <EnhancedEditor
        ref={ref}
        sessionId={sessionId}
        sessionTitle={sessionTitle}
        enhancedNoteId={enhancedNoteId}
        content={enhancedNote.content}
        onNavigateToTitle={onNavigateToTitle}
        onViewReady={onViewReady}
        onViewDisposed={onViewDisposed}
      />
    );
  },
);

function EmptySummary({ sessionId }: { sessionId: string }) {
  const generate = useMutation({
    mutationFn: async () => {
      if (!isMainAITaskHostWindow()) {
        await requestMainEnhance(sessionId);
        return;
      }
      const service = getEnhancerService();
      if (!service) throw new Error("Summary generation is not ready yet.");
      const result = await service.enhance(sessionId);
      if (result.type === "no_model")
        throw new Error("Set up AI summaries first.");
      if (result.type === "too_short")
        throw new Error("Not enough transcript recorded to summarize.");
    },
  });
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-3 text-center">
        <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
          <span aria-hidden="true" className="text-lg font-semibold">
            ✦
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-foreground text-base font-semibold">
            <Trans>Interview summary</Trans>
          </h2>
          <p className="text-muted-foreground text-sm leading-5">
            <Trans>
              Generate a structured summary from the available interview
              transcript. You can review and edit the result afterward.
            </Trans>
          </p>
        </div>
        <Button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="mt-1"
        >
          <Trans>Generate summary</Trans>
        </Button>
        {generate.error && (
          <p role="alert" className="text-destructive text-sm">
            {generate.error.message}
          </p>
        )}
      </div>
    </div>
  );
}
