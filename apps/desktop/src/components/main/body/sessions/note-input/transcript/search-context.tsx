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

function getMatchingElements(
  container: HTMLElement | null,
  query: string,
): HTMLElement[] {
  if (!container || !query) {
    return [];
  }

  const allSpans = Array.from(
    container.querySelectorAll<HTMLElement>("[data-word-id]"),
  );
  return allSpans.filter((span) => {
    const text = span.textContent || "";
    return text.toLowerCase().includes(query.toLowerCase());
  });
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  const ensureContainer = useCallback(() => {
    if (typeof document === "undefined") {
      containerRef.current = null;
      return null;
    }

    const current = containerRef.current;
    if (current && document.body.contains(current)) {
      return current;
    }

    const next = document.querySelector<HTMLElement>(
      "[data-transcript-container]",
    );
    containerRef.current = next;
    return next;
  }, []);

  const close = useCallback(() => {
    setIsVisible(false);
  }, []);

  useHotkeys(
    "mod+f",
    (event) => {
      event.preventDefault();
      const container = ensureContainer();
      if (!container) {
        return;
      }

      setIsVisible((prev) => !prev);
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [ensureContainer],
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
    }
  }, [isVisible]);

  useEffect(() => {
    const container = ensureContainer();
    if (!container || !query) {
      setTotalMatches(0);
      setCurrentMatchIndex(0);
      setActiveMatchId(null);
      return;
    }

    const matches = getMatchingElements(container, query);
    setTotalMatches(matches.length);
    setCurrentMatchIndex(0);
    setActiveMatchId(matches[0]?.dataset.wordId || null);
  }, [query, ensureContainer]);

  const onNext = useCallback(() => {
    const container = ensureContainer();
    if (!container) {
      return;
    }

    const matches = getMatchingElements(container, query);
    if (matches.length === 0) {
      return;
    }

    const nextIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIndex);
    setActiveMatchId(matches[nextIndex]?.dataset.wordId || null);
  }, [ensureContainer, query, currentMatchIndex]);

  const onPrev = useCallback(() => {
    const container = ensureContainer();
    if (!container) {
      return;
    }

    const matches = getMatchingElements(container, query);
    if (matches.length === 0) {
      return;
    }

    const prevIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIndex);
    setActiveMatchId(matches[prevIndex]?.dataset.wordId || null);
  }, [ensureContainer, query, currentMatchIndex]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const container = ensureContainer();
    if (!container) {
      setIsVisible(false);
    }
  }, [isVisible, ensureContainer]);

  useEffect(() => {
    if (!isVisible || !activeMatchId) {
      return;
    }

    const container = ensureContainer();
    if (!container) {
      return;
    }

    const element = container.querySelector<HTMLElement>(
      `[data-word-id="${activeMatchId}"]`,
    );

    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isVisible, activeMatchId, ensureContainer]);

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
