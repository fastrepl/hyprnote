import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@hypr/ui/components/ui/context-menu";
import { cn } from "@hypr/utils";
import { useCallback, useMemo } from "react";
import { SegmentWord } from "../../../../../../../utils/segment";
import { useTranscriptSearch } from "../search-context";
import { Operations } from "./operations";

export function WordSpan({
  word,
  highlightState,
  audioExists,
  operations,
  onClickWord,
}: {
  word: SegmentWord;
  highlightState: "current" | "buffer" | "none";
  audioExists: boolean;
  operations?: Operations;
  onClickWord: (word: SegmentWord) => void;
}) {
  const mode = operations && Object.keys(operations).length > 0 ? "editor" : "viewer";
  const { isMatch, isActive } = useTranscriptSearchHighlights(word);

  const className = cn([
    audioExists && "cursor-pointer",
    audioExists && highlightState !== "none" && "hover:bg-neutral-200/60",
    !word.isFinal && ["opacity-60", "italic"],
    highlightState === "current" && !isMatch && "bg-blue-200/70",
    highlightState === "buffer" && !isMatch && "bg-blue-200/30",
    isMatch && !isActive && "bg-yellow-200/50",
    isActive && "bg-yellow-400",
  ]);

  const handleClick = useCallback(() => {
    onClickWord(word);
  }, [word, onClickWord]);

  if (mode === "editor" && word.id) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <span onClick={handleClick} className={className} data-word-id={word.id}>
            {word.text}
          </span>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => operations?.onDeleteWord?.(word.id!)}>
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return (
    <span onClick={handleClick} className={className} data-word-id={word.id}>
      {word.text}
    </span>
  );
}

function useTranscriptSearchHighlights(word: SegmentWord) {
  const search = useTranscriptSearch();
  const query = search?.query ?? "";
  const isVisible = Boolean(search?.isVisible);
  const activeMatchId = search?.activeMatchId ?? null;

  const isMatch = useMemo(() => {
    if (!isVisible || !query || !word.text) {
      return false;
    }

    return word.text.toLowerCase().includes(query.toLowerCase());
  }, [isVisible, query, word.text]);

  const isActive = word.id === activeMatchId;

  return { isMatch, isActive };
}
