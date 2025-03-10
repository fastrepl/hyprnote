import { useCallback, type ChangeEvent } from "react";

import { useSession } from "@/contexts";
import { useOngoingSession } from "@/contexts/ongoing-session";

import TitleInput from "./title-input";
import ListenButton from "./listen-button";
import Chips from "./chips";

interface NoteHeaderProps {
  onNavigateToEditor?: () => void;
}

export function NoteHeader({ onNavigateToEditor }: NoteHeaderProps) {
  const ongoingSessionStore = useOngoingSession((s) => ({
    onGoingSessionId: s.sessionId,
    listening: s.listening,
    start: s.start,
    pause: s.pause,
  }));

  const sessionStore = useSession((s) => ({
    sessionInView: s.session,
    updateTitle: s.updateTitle,
    persistSession: s.persistSession,
  }));

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    sessionStore.updateTitle(e.target.value);
    sessionStore.persistSession();
  };

  const handleClickListen = useCallback(() => {
    ongoingSessionStore.start(sessionStore.sessionInView.id);
  }, [sessionStore.sessionInView, ongoingSessionStore.start]);

  return (
    <>
      <div className="flex flex-row items-center justify-between sm:pl-8 px-4 pt-6">
        <TitleInput
          value={sessionStore.sessionInView.title}
          onChange={handleTitleChange}
          onNavigateToEditor={onNavigateToEditor}
        />
        <ListenButton
          isCurrent={
            sessionStore.sessionInView.id ===
            ongoingSessionStore.onGoingSessionId
          }
          isListening={ongoingSessionStore.listening}
          onClick={handleClickListen}
          onStop={ongoingSessionStore.pause}
        />
      </div>
      <Chips />
    </>
  );
}
