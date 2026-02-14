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

function createSegments(rawText: string, query: string): HighlightSegment[] {
  const text = rawText.normalize("NFC");
  const lowerText = text.toLowerCase();

  // Tokenize query to handle multi-word searches
  const tokens = query
    .normalize("NFC")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return [{ text, isMatch: false }];

  // Collect all match ranges from all tokens
  const ranges: { start: number; end: number }[] = [];
  for (const token of tokens) {
    let cursor = 0;
    let index = lowerText.indexOf(token, cursor);
    while (index !== -1) {
      ranges.push({ start: index, end: index + token.length });
      cursor = index + 1;
      index = lowerText.indexOf(token, cursor);
    }
  }

  if (ranges.length === 0) {
    return [{ text, isMatch: false }];
  }

  // Sort and merge overlapping ranges
  ranges.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [{ ...ranges[0] }];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    if (ranges[i].start <= last.end) {
      last.end = Math.max(last.end, ranges[i].end);
    } else {
      merged.push({ ...ranges[i] });
    }
  }

  // Build segments
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const range of merged) {
    if (range.start > cursor) {
      segments.push({ text: text.slice(cursor, range.start), isMatch: false });
    }
    segments.push({ text: text.slice(range.start, range.end), isMatch: true });
    cursor = range.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), isMatch: false });
  }

  return segments.length ? segments : [{ text, isMatch: false }];
}
