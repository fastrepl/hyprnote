import { Fragment, useCallback, useMemo } from "react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@hypr/ui/components/ui/context-menu";
import { cn } from "@hypr/utils";

import { SegmentWord } from "../../../../../../../utils/segment";
import { useTranscriptSearch } from "../search-context";
import { Operations } from "./operations";

interface WordSpanProps {
  word: SegmentWord;
  highlightState: "current" | "buffer" | "none";
  audioExists: boolean;
  operations?: Operations;
  onClickWord: (word: SegmentWord) => void;
}

export function WordSpan(props: WordSpanProps) {
  const hasOperations =
    props.operations && Object.keys(props.operations).length > 0;

  if (hasOperations && props.word.id) {
    return <EditorWordSpan {...props} operations={props.operations!} />;
  }

  return <ViewerWordSpan {...props} />;
}

function ViewerWordSpan({
  word,
  highlightState,
  audioExists,
  onClickWord,
}: Omit<WordSpanProps, "operations">) {
  const { segments, isActive } = useTranscriptSearchHighlights(word);
  const hasMatch = segments.some((segment) => segment.isMatch);

  const content = useHighlightedContent(word, segments, isActive);

  const className = useMemo(
    () =>
      cn([
        audioExists && "cursor-pointer",
        audioExists && highlightState !== "none" && "hover:bg-neutral-200/60",
        !word.isFinal && ["opacity-60", "italic"],
        highlightState === "current" && !hasMatch && "bg-blue-200/70",
        highlightState === "buffer" && !hasMatch && "bg-blue-200/30",
      ]),
    [audioExists, highlightState, word.isFinal, hasMatch],
  );

  const handleClick = useCallback(() => {
    onClickWord(word);
  }, [word, onClickWord]);

  return (
    <span onClick={handleClick} className={className} data-word-id={word.id}>
      {content}
    </span>
  );
}

function EditorWordSpan({
  word,
  highlightState,
  audioExists,
  operations,
  onClickWord,
}: Omit<WordSpanProps, "operations"> & { operations: Operations }) {
  const { segments, isActive } = useTranscriptSearchHighlights(word);
  const hasMatch = segments.some((segment) => segment.isMatch);

  const content = useHighlightedContent(word, segments, isActive);

  const className = useMemo(
    () =>
      cn([
        audioExists && "cursor-pointer",
        audioExists && highlightState !== "none" && "hover:bg-neutral-200/60",
        !word.isFinal && ["opacity-60", "italic"],
        highlightState === "current" && !hasMatch && "bg-blue-200/70",
        highlightState === "buffer" && !hasMatch && "bg-blue-200/30",
      ]),
    [audioExists, highlightState, word.isFinal, hasMatch],
  );

  const handleClick = useCallback(() => {
    onClickWord(word);
  }, [word, onClickWord]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <span
          onClick={handleClick}
          className={className}
          data-word-id={word.id}
        >
          {content}
        </span>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => operations.onDeleteWord?.(word.id!)}>
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

type HighlightSegment = { text: string; isMatch: boolean };

function useHighlightedContent(
  word: SegmentWord,
  segments: HighlightSegment[],
  isActive: boolean,
) {
  return useMemo(() => {
    const baseKey = word.id ?? word.text ?? "word";

    return segments.map((piece, index) =>
      piece.isMatch ? (
        <span
          key={`${baseKey}-match-${index}`}
          className={isActive ? "bg-yellow-500" : "bg-yellow-200/50"}
        >
          {piece.text}
        </span>
      ) : (
        <Fragment key={`${baseKey}-text-${index}`}>{piece.text}</Fragment>
      ),
    );
  }, [segments, isActive, word.id, word.text]);
}

function useTranscriptSearchHighlights(word: SegmentWord) {
  const search = useTranscriptSearch();
  const query = search?.query?.trim() ?? "";
  const isVisible = Boolean(search?.isVisible);
  const activeMatchId = search?.activeMatchId ?? null;

  const segments = useMemo(() => {
    const text = word.text ?? "";

    if (!text) {
      return [{ text: "", isMatch: false }];
    }

    if (!isVisible || !query) {
      return [{ text, isMatch: false }];
    }

    return createSegments(text, query);
  }, [isVisible, query, word.text]);

  const isActive = word.id === activeMatchId;

  return { segments, isActive };
}

function createSegments(text: string, query: string): HighlightSegment[] {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const segments: HighlightSegment[] = [];

  let cursor = 0;
  let index = lowerText.indexOf(lowerQuery, cursor);

  while (index !== -1) {
    if (index > cursor) {
      segments.push({ text: text.slice(cursor, index), isMatch: false });
    }

    const end = index + query.length;
    segments.push({ text: text.slice(index, end), isMatch: true });
    cursor = end;
    index = lowerText.indexOf(lowerQuery, cursor);
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), isMatch: false });
  }

  return segments.length ? segments : [{ text, isMatch: false }];
}
