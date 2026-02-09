import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface SearchContextValue {
  query: string;
  isVisible: boolean;
  currentMatchIndex: number;
  totalMatches: number;
  activeMatchId: string | null;
  onNext: () => void;
  onPrev: () => void;
  close: () => void;
  setQuery: (query: string) => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function useTranscriptSearch() {
  return useContext(SearchContext);
}

interface MatchResult {
  element: HTMLElement;
  id: string | null;
}

function getMatchingElements(
  container: HTMLElement | null,
  query: string,
): MatchResult[] {
  if (!container || !query) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase().normalize("NFC");
  if (!normalizedQuery) return [];

  const wordSpans = Array.from(
    container.querySelectorAll<HTMLElement>("[data-word-id]"),
  );

  if (wordSpans.length > 0) {
    return getTranscriptMatches(wordSpans, normalizedQuery);
  }

  const proseMirror =
    container.querySelector<HTMLElement>(".ProseMirror") ??
    (container.classList.contains("ProseMirror") ? container : null);
  if (proseMirror) {
    return getEditorMatches(proseMirror, normalizedQuery);
  }

  return [];
}

function getTranscriptMatches(
  allSpans: HTMLElement[],
  normalizedQuery: string,
): MatchResult[] {
  const spanPositions: { start: number; end: number }[] = [];
  let fullText = "";

  for (let i = 0; i < allSpans.length; i++) {
    const text = (allSpans[i].textContent || "").normalize("NFC");
    if (i > 0) fullText += " ";
    const start = fullText.length;
    fullText += text;
    spanPositions.push({ start, end: fullText.length });
  }

  const lowerFullText = fullText.toLowerCase();
  const result: MatchResult[] = [];
  let searchFrom = 0;

  while (searchFrom <= lowerFullText.length - normalizedQuery.length) {
    const idx = lowerFullText.indexOf(normalizedQuery, searchFrom);
    if (idx === -1) break;

    for (let i = 0; i < spanPositions.length; i++) {
      const { start, end } = spanPositions[i];
      if (idx >= start && idx < end) {
        result.push({
          element: allSpans[i],
          id: allSpans[i].dataset.wordId || null,
        });
        break;
      }
      if (
        i < spanPositions.length - 1 &&
        idx >= end &&
        idx < spanPositions[i + 1].start
      ) {
        result.push({
          element: allSpans[i + 1],
          id: allSpans[i + 1].dataset.wordId || null,
        });
        break;
      }
    }

    searchFrom = idx + 1;
  }

  return result;
}

function getEditorMatches(
  proseMirror: HTMLElement,
  normalizedQuery: string,
): MatchResult[] {
  const blocks = Array.from(
    proseMirror.querySelectorAll<HTMLElement>(
      "p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th",
    ),
  );

  const result: MatchResult[] = [];

  for (const block of blocks) {
    const text = (block.textContent || "").normalize("NFC").toLowerCase();
    let searchFrom = 0;

    while (searchFrom <= text.length - normalizedQuery.length) {
      const idx = text.indexOf(normalizedQuery, searchFrom);
      if (idx === -1) break;
      result.push({ element: block, id: null });
      searchFrom = idx + 1;
    }
  }

  return result;
}

function findSearchContainer(): HTMLElement | null {
  if (typeof document === "undefined") return null;

  const transcript = document.querySelector<HTMLElement>(
    "[data-transcript-container]",
  );
  if (transcript) return transcript;

  const proseMirror = document.querySelector<HTMLElement>(".ProseMirror");
  if (proseMirror) {
    return proseMirror.parentElement ?? proseMirror;
  }

  return null;
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const matchesRef = useRef<MatchResult[]>([]);

  const close = useCallback(() => {
    setIsVisible(false);
  }, []);

  useHotkeys(
    "mod+f",
    (event) => {
      event.preventDefault();
      setIsVisible((prev) => !prev);
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [],
  );

  useHotkeys(
    "esc",
    () => {
      close();
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [close],
  );

  useEffect(() => {
    if (!isVisible) {
      setQuery("");
      setCurrentMatchIndex(0);
      setActiveMatchId(null);
      matchesRef.current = [];
    }
  }, [isVisible]);

  useEffect(() => {
    const container = findSearchContainer();
    if (!container || !query) {
      setTotalMatches(0);
      setCurrentMatchIndex(0);
      setActiveMatchId(null);
      matchesRef.current = [];
      return;
    }

    const matches = getMatchingElements(container, query);
    matchesRef.current = matches;
    setTotalMatches(matches.length);
    setCurrentMatchIndex(0);
    setActiveMatchId(matches[0]?.id || null);

    if (matches.length > 0 && !matches[0].id) {
      matches[0].element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [query]);

  const onNext = useCallback(() => {
    const matches = matchesRef.current;
    if (matches.length === 0) return;

    const nextIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIndex);
    setActiveMatchId(matches[nextIndex]?.id || null);
    matches[nextIndex]?.element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [currentMatchIndex]);

  const onPrev = useCallback(() => {
    const matches = matchesRef.current;
    if (matches.length === 0) return;

    const prevIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIndex);
    setActiveMatchId(matches[prevIndex]?.id || null);
    matches[prevIndex]?.element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [currentMatchIndex]);

  useEffect(() => {
    if (!isVisible || !activeMatchId) return;

    const container = findSearchContainer();
    if (!container) return;

    const element = container.querySelector<HTMLElement>(
      `[data-word-id="${activeMatchId}"]`,
    );

    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isVisible, activeMatchId]);

  const value = useMemo(
    () => ({
      query,
      isVisible,
      currentMatchIndex,
      totalMatches,
      activeMatchId,
      onNext,
      onPrev,
      close,
      setQuery,
    }),
    [
      query,
      isVisible,
      currentMatchIndex,
      totalMatches,
      activeMatchId,
      onNext,
      onPrev,
      close,
    ],
  );

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}
