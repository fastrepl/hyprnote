import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@hypr/ui/components/ui/context-menu";
import { cn } from "@hypr/utils";
import { useCallback } from "react";
import { SegmentWord } from "../../../../../../../utils/segment";
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
  const className = cn([
    audioExists && "cursor-pointer",
    audioExists && highlightState !== "none" && "hover:bg-neutral-200/60",
    !word.isFinal && ["opacity-60", "italic"],
    highlightState === "current" && "bg-blue-200/70",
    highlightState === "buffer" && "bg-blue-200/30",
  ]);

  const handleClick = useCallback(() => {
    onClickWord(word);
  }, [word, onClickWord]);

  if (mode === "editor" && word.id) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <span onClick={handleClick} className={className}>
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
    <span onClick={handleClick} className={className}>
      {word.text}
    </span>
  );
}
