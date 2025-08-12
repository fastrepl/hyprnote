import { useMatch } from "@tanstack/react-router";
import { type ChangeEvent, useEffect, useRef, useState } from "react";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { useSession } from "@hypr/utils/contexts";
import { useTitleGenerationPendingState } from "../../../hooks/enhance-pending";
import Chips from "./chips";
import ListenButton from "./listen-button";
import TitleInput from "./title-input";
import TitleShimmer from "./title-shimmer";

function useContainerWidth(ref: React.RefObject<HTMLElement>) {
  const [width, setWidth] = useState(0);
  const [debouncedWidth, setDebouncedWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedWidth(width);
    }, 50);

    return () => clearTimeout(timer);
  }, [width]);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(element);
    setWidth(element.getBoundingClientRect().width);

    return () => resizeObserver.disconnect();
  }, [ref]);

  return debouncedWidth;
}

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
  const isTitleGenerating = useTitleGenerationPendingState(sessionId);

  const containerRef = useRef<HTMLDivElement>(null);
  const headerWidth = useContainerWidth(containerRef);

  const [isVeryNarrow, setIsVeryNarrow] = useState(headerWidth < 280);
  const [isNarrow, setIsNarrow] = useState(headerWidth < 450);
  const [isCompact, setIsCompact] = useState(headerWidth < 600);

  useEffect(() => {
    setIsVeryNarrow(prev => headerWidth < (prev ? 300 : 280));
    setIsNarrow(prev => headerWidth < (prev ? 470 : 450));
    setIsCompact(prev => headerWidth < (prev ? 620 : 600));
  }, [headerWidth]);

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateTitle(e.target.value);
  };

  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const windowLabel = getCurrentWebviewWindowLabel();
  const isInNoteMain = windowLabel === "main" && noteMatch;

  return (
    <div
      ref={containerRef}
      className={`flex items-center w-full pl-8 pr-6 pb-4 gap-4 min-w-0 ${
        isVeryNarrow ? "pl-4 pr-3" : isNarrow ? "pl-6 pr-4" : "pl-8 pr-6"
      }`}
    >
      <div className="flex-1 space-y-1">
        <TitleShimmer isShimmering={isTitleGenerating}>
          <TitleInput
            editable={editable}
            value={sessionTitle}
            onChange={handleTitleChange}
            onNavigateToEditor={onNavigateToEditor}
            isGenerating={isTitleGenerating}
          />
        </TitleShimmer>
        <Chips
          sessionId={sessionId}
          hashtags={hashtags}
          isVeryNarrow={isVeryNarrow}
          isNarrow={isNarrow}
          isCompact={isCompact}
        />
      </div>

      {isInNoteMain && <ListenButton sessionId={sessionId} isCompact={isCompact} />}
    </div>
  );
}
