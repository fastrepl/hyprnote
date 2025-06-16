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
  hashtags?: string[];
}

export function NoteHeader(
  { onNavigateToEditor, editable, sessionId, hashtags = [] }: NoteHeaderProps,
) {
  const updateTitle = useSession(sessionId, (s) => s.updateTitle);
  const sessionTitle = useSession(sessionId, (s) => s.session.title);

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateTitle(e.target.value);
  };

  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const windowLabel = getCurrentWebviewWindowLabel();
  const isInNoteMain = windowLabel === "main" && noteMatch;

  return (
    <div className="flex items-center w-full pl-8 pr-6 pb-4 gap-4">
      <div className="flex-1 space-y-1">
        <TitleInput
          editable={editable}
          value={sessionTitle}
          onChange={handleTitleChange}
          onNavigateToEditor={onNavigateToEditor}
        />
        <Chips sessionId={sessionId} />
      </div>

      {isInNoteMain && <ListenButton sessionId={sessionId} />}
    </div>
  );
}
