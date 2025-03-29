import { useMatch } from "@tanstack/react-router";
import { type ChangeEvent } from "react";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { useSession } from "@hypr/utils/contexts";
import Chips from "./chips";
import ListenButton from "./listen-button";
import TitleInput from "./title-input";

interface NoteHeaderProps {
  onNavigateToEditor?: () => void;
  editable?: boolean;
  sessionId: string;
}

export function NoteHeader({ onNavigateToEditor, editable, sessionId }: NoteHeaderProps) {
  const sessionStore = useSession(sessionId, (s) => ({
    sessionInView: s.session,
    updateTitle: s.updateTitle,
    persistSession: s.persistSession,
  }));

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    sessionStore.updateTitle(e.target.value);
    sessionStore.persistSession();
  };

  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const windowLabel = getCurrentWebviewWindowLabel();
  const isInNoteMain = windowLabel === "main" && noteMatch;

  return (
    <>
      <div className="flex flex-row items-center justify-between pl-8 pr-4">
        <TitleInput
          editable={editable}
          value={sessionStore.sessionInView?.title ?? ""}
          onChange={handleTitleChange}
          onNavigateToEditor={onNavigateToEditor}
        />
        {isInNoteMain && <ListenButton sessionId={sessionId} />}
      </div>
      <Chips />
    </>
  );
}
