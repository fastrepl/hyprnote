import { useMemo } from "react";

import { cn } from "@hypr/utils";
import { useListener } from "../../../../contexts/listener";
import { useSTTConnection } from "../../../../hooks/useSTTConnection";
import * as main from "../../../../store/tinybase/main";
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
          !disabled && "animate-ping",
        ])}
      >
      </div>
    </div>
  );
}

export function useListenButtonState(sessionId: string) {
  const listener = useListener((state) => ({
    active: state.status !== "inactive" && state.sessionId === sessionId,
  }));
  const sttConnection = useSTTConnection();

  const shouldRender = !listener.active;
  const isDisabled = !sttConnection;
  const warningMessage = !sttConnection ? "Transcription model not available." : "";

  return {
    shouldRender,
    isDisabled,
    warningMessage,
  };
}
