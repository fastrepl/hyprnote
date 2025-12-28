import {
  DependencyList,
  RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { SpeakerHintStorage, Word } from "@hypr/store";

import * as main from "../../../../../../../store/tinybase/main";
import {
  buildSegments,
  type RuntimeSpeakerHint,
  type Segment,
} from "../../../../../../../utils/segment";
import { convertStorageHintsToRuntime } from "../../../../../../../utils/speaker-hints";

export function useFinalWords(transcriptId: string): (Word & { id: string })[] {
  const store = main.UI.useStore(main.STORE_ID);
  const wordIds = main.UI.useSliceRowIds(
    main.INDEXES.wordsByTranscript,
    transcriptId,
    main.STORE_ID,
  );

  return useMemo(() => {
    if (!store || !wordIds) {
      return [];
    }

    return wordIds.map((wordId) => ({
      ...(store.getRow("words", wordId) as unknown as Word),
      id: wordId,
    }));
  }, [store, wordIds]);
}

export function useFinalSpeakerHints(
  transcriptId: string,
): RuntimeSpeakerHint[] {
  const store = main.UI.useStore(main.STORE_ID);
  const wordIds = main.UI.useSliceRowIds(
    main.INDEXES.wordsByTranscript,
    transcriptId,
    main.STORE_ID,
  );
  const speakerHintIds = main.UI.useSliceRowIds(
    main.INDEXES.speakerHintsByTranscript,
    transcriptId,
    main.STORE_ID,
  );

  return useMemo(() => {
    if (!store || !wordIds) {
      return [];
    }

    const wordIdToIndex = new Map<string, number>();
    wordIds.forEach((wordId, index) => {
      wordIdToIndex.set(wordId, index);
    });

    const storageHints: SpeakerHintStorage[] = [];
    speakerHintIds?.forEach((hintId) => {
      const hint = store.getRow("speaker_hints", hintId) as
        | SpeakerHintStorage
        | undefined;
      if (hint) {
        storageHints.push(hint);
      }
    });

    return convertStorageHintsToRuntime(storageHints, wordIdToIndex);
  }, [store, wordIds, speakerHintIds]);
}

export function useTranscriptOffset(transcriptId: string): number {
  const transcriptStartedAt = main.UI.useCell(
    "transcripts",
    transcriptId,
    "started_at",
    main.STORE_ID,
  );

  const sessionId = main.UI.useCell(
    "transcripts",
    transcriptId,
    "session_id",
    main.STORE_ID,
  );

  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId ?? "",
    main.STORE_ID,
  );

  const firstTranscriptId = transcriptIds?.[0];
  const firstTranscriptStartedAt = main.UI.useCell(
    "transcripts",
    firstTranscriptId ?? "",
    "started_at",
    main.STORE_ID,
  );

  return transcriptStartedAt && firstTranscriptStartedAt
    ? new Date(transcriptStartedAt).getTime() -
        new Date(firstTranscriptStartedAt).getTime()
    : 0;
}

export function useSessionSpeakers(sessionId?: string) {
  const mappingIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionParticipantsBySession,
    sessionId ?? "",
    main.STORE_ID,
  ) as string[];

  if (!sessionId) {
    return undefined;
  }

  return mappingIds.length;
}

type SegmentsBuilder = typeof buildSegments;

export const useSegments: SegmentsBuilder = (
  finalWords,
  partialWords,
  speakerHints,
  options,
) => {
  const segments = useMemo(
    () => buildSegments(finalWords, partialWords, speakerHints, options),
    [finalWords, partialWords, speakerHints, options],
  );

  return segments;
};

export const useStableSegments: SegmentsBuilder = (
  finalWords,
  partialWords,
  speakerHints,
  options,
) => {
  const cacheRef = useRef<Map<string, Segment>>(new Map());

  return useMemo(() => {
    const fresh = buildSegments(
      finalWords,
      partialWords,
      speakerHints,
      options,
    );
    const nextCache = new Map<string, Segment>();

    const segments = fresh.map((segment) => {
      const key = createStableSegmentKey(segment);
      const cached = cacheRef.current.get(key);

      if (cached && segmentsDeepEqual(cached, segment)) {
        nextCache.set(key, cached);
        return cached;
      }

      nextCache.set(key, segment);
      return segment;
    });

    cacheRef.current = nextCache;
    return segments;
  }, [finalWords, partialWords, speakerHints, options]);
};

function createStableSegmentKey(segment: Segment) {
  const firstWord = segment.words[0];
  const lastWord = segment.words[segment.words.length - 1];

  const firstAnchor = firstWord
    ? (firstWord.id ?? `start:${firstWord.start_ms}`)
    : "none";

  const lastAnchor = lastWord
    ? (lastWord.id ?? `end:${lastWord.end_ms}`)
    : "none";

  return [
    segment.key.channel,
    segment.key.speaker_index ?? "none",
    segment.key.speaker_human_id ?? "none",
    firstAnchor,
    lastAnchor,
  ].join(":");
}

export function createSegmentKey(
  segment: Segment,
  transcriptId: string,
  fallbackIndex: number,
) {
  const stableKey = createStableSegmentKey(segment);
  if (segment.words.length === 0) {
    return [transcriptId, stableKey, `index:${fallbackIndex}`].join("-");
  }

  return [transcriptId, stableKey].join("-");
}

function segmentsDeepEqual(a: Segment, b: Segment) {
  if (
    a.key.channel !== b.key.channel ||
    a.key.speaker_index !== b.key.speaker_index ||
    a.key.speaker_human_id !== b.key.speaker_human_id ||
    a.words.length !== b.words.length
  ) {
    return false;
  }

  for (let index = 0; index < a.words.length; index += 1) {
    const aw = a.words[index];
    const bw = b.words[index];

    if (
      aw.id !== bw.id ||
      aw.text !== bw.text ||
      aw.start_ms !== bw.start_ms ||
      aw.end_ms !== bw.end_ms ||
      aw.channel !== bw.channel ||
      aw.isFinal !== bw.isFinal
    ) {
      return false;
    }
  }

  return true;
}

export function segmentsShallowEqual(a: Segment[], b: Segment[]) {
  if (a === b) {
    return true;
  }

  if (a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }

  return true;
}

export function useScrollDetection(
  containerRef: RefObject<HTMLDivElement | null>,
) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const lastScrollTopRef = useRef(0);
  const userScrolledAwayRef = useRef(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    lastScrollTopRef.current = element.scrollTop;

    const handleScroll = () => {
      const threshold = 100;
      const distanceToBottom =
        element.scrollHeight - element.scrollTop - element.clientHeight;
      const isNearBottom = distanceToBottom < threshold;
      setIsAtBottom(isNearBottom);

      const currentTop = element.scrollTop;
      const prevTop = lastScrollTopRef.current;
      lastScrollTopRef.current = currentTop;

      const scrolledUp = currentTop < prevTop - 2;
      if (scrolledUp) {
        userScrolledAwayRef.current = true;
        setAutoScrollEnabled(false);
      }

      if (isNearBottom && !userScrolledAwayRef.current) {
        setAutoScrollEnabled(true);
      }
    };

    element.addEventListener("scroll", handleScroll);
    return () => element.removeEventListener("scroll", handleScroll);
  }, [containerRef]);

  const scrollToBottom = () => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    userScrolledAwayRef.current = false;
    setAutoScrollEnabled(true);
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  };

  return { isAtBottom, autoScrollEnabled, scrollToBottom };
}

export function useAutoScroll(
  containerRef: RefObject<HTMLElement | null>,
  deps: DependencyList,
  enabled = true,
) {
  const rafRef = useRef<number | null>(null);
  const lastHeightRef = useRef(0);
  const initialFlushRef = useRef(enabled);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    lastHeightRef.current = element.scrollHeight;

    const isPinned = () => {
      const distanceToBottom =
        element.scrollHeight - element.scrollTop - element.clientHeight;
      return distanceToBottom < 80;
    };

    const flush = () => {
      element.scrollTop = element.scrollHeight;
    };

    const schedule = (force = false) => {
      if (!force && (!enabled || !isPinned())) {
        return;
      }

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(flush);
      });
    };

    if (initialFlushRef.current) {
      initialFlushRef.current = false;
      schedule(true);
    } else {
      schedule();
    }

    if (
      typeof window === "undefined" ||
      typeof window.ResizeObserver === "undefined"
    ) {
      const mutationObserver = new MutationObserver(() => {
        const nextHeight = element.scrollHeight;
        if (nextHeight === lastHeightRef.current) {
          return;
        }
        lastHeightRef.current = nextHeight;
        schedule();
      });

      mutationObserver.observe(element, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      return () => {
        mutationObserver.disconnect();
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
    }

    const resizeObserver = new window.ResizeObserver(() => {
      const nextHeight = element.scrollHeight;
      if (nextHeight === lastHeightRef.current) {
        return;
      }
      lastHeightRef.current = nextHeight;
      schedule();
    });

    const targets = new Set<Element>([element]);
    element
      .querySelectorAll<HTMLElement>("[data-virtual-root]")
      .forEach((target) => targets.add(target));
    targets.forEach((target) => resizeObserver.observe(target));

    return () => {
      resizeObserver.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, deps);
}
