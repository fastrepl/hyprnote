import { useMemo } from "react";
import type { Segment } from "../types/transcript";
import { useWords } from "./useWords";

export const useSegments = (sessionId: string): Segment[] => {
  const { words } = useWords(sessionId);

  const segments = useMemo(() => {
    if (words.length === 0) {
      return [];
    }

    const result: Segment[] = [];
    let currentSegment: Segment | null = null;

    for (const word of words) {
      if (!currentSegment || currentSegment.speaker !== word.speaker) {
        if (currentSegment) {
          result.push(currentSegment);
        }
        currentSegment = {
          speaker: word.speaker,
          words: [word],
          startTime: word.start,
          endTime: word.end,
        };
      } else {
        currentSegment.words.push(word);
        currentSegment.endTime = word.end;
      }
    }

    if (currentSegment) {
      result.push(currentSegment);
    }

    return result;
  }, [words]);

  return segments;
};
