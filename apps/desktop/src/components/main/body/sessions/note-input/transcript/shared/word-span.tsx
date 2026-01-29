import { Fragment, useCallback, useMemo } from "react";

import { cn } from "@hypr/utils";

import { useNativeContextMenu } from "../../../../../../../hooks/useNativeContextMenu";
import { SegmentWord } from "../../../../../../../utils/segment";
import { useTranscriptSearch } from "../search-context";
import { Operations } from "./operations";

interface WordSpanProps {
  word: SegmentWord;
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
  audioExists,
  onClickWord,
}: Omit<WordSpanProps, "operations">) {
  const { segments, isActive } = useTranscriptSearchHighlights(word);

  const content = useHighlightedContent(word, segments, isActive);

  const className = useMemo(
    () =>
      cn([
        audioExists && "cursor-pointer hover:bg-neutral-200/60",
        !word.isFinal && ["opacity-60", "italic"],
      ]),
    [audioExists, word.isFinal],
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
  audioExists,
  operations,
  onClickWord,
}: Omit<WordSpanProps, "operations"> & { operations: Operations }) {
  const { segments, isActive } = useTranscriptSearchHighlights(word);

  const content = useHighlightedContent(word, segments, isActive);

  const className = useMemo(
    () =>
      cn([
        audioExists && "cursor-pointer hover:bg-neutral-200/60",
        !word.isFinal && ["opacity-60", "italic"],
      ]),
    [audioExists, word.isFinal],
  );

  const handleClick = useCallback(() => {
    onClickWord(word);
  }, [word, onClickWord]);

  const contextMenu = useMemo(
    () => [
      {
        id: "delete",
        text: "Delete",
        action: () => operations.onDeleteWord?.(word.id!),
      },
    ],
    [operations, word.id],
  );

  const showMenu = useNativeContextMenu(contextMenu);

  return (
    <span
      onClick={handleClick}
      onContextMenu={showMenu}
      className={className}
      data-word-id={word.id}
    >
      {content}
    </span>
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
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  if (queryTerms.length === 0) {
    return [{ text, isMatch: false }];
  }

  const matches: Array<{ start: number; end: number }> = [];

  for (const term of queryTerms) {
    let index = lowerText.indexOf(term);
    while (index !== -1) {
      matches.push({ start: index, end: index + term.length });
      index = lowerText.indexOf(term, index + 1);
    }
  }

  if (matches.length === 0) {
    return [{ text, isMatch: false }];
  }

  matches.sort((a, b) => a.start - b.start);

  const merged: Array<{ start: number; end: number }> = [];
  for (const match of matches) {
    if (merged.length === 0 || match.start > merged[merged.length - 1].end) {
      merged.push({ ...match });
    } else {
      merged[merged.length - 1].end = Math.max(
        merged[merged.length - 1].end,
        match.end,
      );
    }
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const match of merged) {
    if (match.start > cursor) {
      segments.push({ text: text.slice(cursor, match.start), isMatch: false });
    }
    segments.push({ text: text.slice(match.start, match.end), isMatch: true });
    cursor = match.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), isMatch: false });
  }

  return segments.length ? segments : [{ text, isMatch: false }];
}
