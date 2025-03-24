import { useMatch } from "@tanstack/react-router";
import { type ChangeEvent, useCallback } from "react";

import { useOngoingSession, useSession } from "@/contexts";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import Chips from "./chips";
import ListenButton from "./listen-button";
import TitleInput from "./title-input";

interface NoteHeaderProps {
  onNavigateToEditor?: () => void;
  editable?: boolean;
  sessionId: string;
}

export function NoteHeader({ onNavigateToEditor, editable, sessionId }: NoteHeaderProps) {
  const ongoingSessionStore = useOngoingSession((s) => ({
    onGoingSessionId: s.sessionId,
    listening: s.listening,
    start: s.start,
    pause: s.pause,
  }));

  const sessionStore = useSession(sessionId, (s) => ({
    sessionInView: s.session,
    updateTitle: s.updateTitle,
    persistSession: s.persistSession,
  }));

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    sessionStore.updateTitle(e.target.value);
    sessionStore.persistSession();
  };

  const handleClickListen = useCallback(() => {
    ongoingSessionStore.start(sessionStore.sessionInView?.id ?? "");
  }, [sessionStore.sessionInView, ongoingSessionStore.start]);

  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const windowLabel = getCurrentWebviewWindowLabel();
  const isInNoteMain = windowLabel === "main" && noteMatch;

  return (
    <>
      <div className="flex flex-row items-center justify-between sm:pl-8 px-4">
        <TitleInput
          editable={editable}
          value={sessionStore.sessionInView?.title ?? ""}
          onChange={handleTitleChange}
          onNavigateToEditor={onNavigateToEditor}
        />
        {isInNoteMain && (
          <ListenButton
            isCurrent={sessionStore.sessionInView?.id
              === ongoingSessionStore.onGoingSessionId}
            isListening={ongoingSessionStore.listening}
            onClick={handleClickListen}
            onStop={ongoingSessionStore.pause}
          />
        )}
      </div>
      <Chips />
    </>
  );
}
