import DOMPurify from "dompurify";
import {
  BuildingIcon,
  ChevronDownIcon,
  ClockIcon,
  FileTextIcon,
  FolderIcon,
  HistoryIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import {
  ScrollFadeOverlay,
  useScrollFade,
} from "@hypr/ui/components/ui/scroll-fade";
import { cn } from "@hypr/utils";

import {
  type SearchEntityType,
  type SearchHit,
  useSearchEngine,
} from "../../../../contexts/search/engine";
import * as main from "../../../../store/tinybase/store/main";
import {
  type Tab,
  type TabInput,
  useTabs,
} from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";

type SortOption = "relevance" | "date_desc" | "date_asc";
type DatePreset = "any" | "today" | "week" | "month" | "year";
type SearchField = "all" | "title";

type LocalSearchResult = {
  id: string;
  type: SearchEntityType;
  title: string;
  titleHighlighted: string;
  content: string;
  contentHighlighted: string;
  created_at: number;
  score: number;
};

const RECENT_SEARCHES_KEY = "hyprnote-recent-searches";
const MAX_RECENT_SEARCHES = 10;
const RECENT_SEARCHES_DISPLAY = 5;
const MAX_FOLDERS_DISPLAY = 5;
const SNIPPET_CONTEXT_BEFORE = 60;
const SNIPPET_CONTEXT_AFTER = 150;
const SNIPPET_FALLBACK_LENGTH = 120;

export const TabItemSearch: TabItem<Extract<Tab, { type: "search" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  handlePinThis,
  handleUnpinThis,
}) => {
  return (
    <TabItemBase
      icon={<SearchIcon className="w-4 h-4" />}
      title="Search"
      selected={tab.active}
      pinned={tab.pinned}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
      handlePinThis={() => handlePinThis(tab)}
      handleUnpinThis={() => handleUnpinThis(tab)}
    />
  );
};

export function TabContentSearch({
  tab,
}: {
  tab: Extract<Tab, { type: "search" }>;
}) {
  return (
    <StandardTabWrapper>
      <SearchView initialQuery={tab.state.query ?? ""} />
    </StandardTabWrapper>
  );
}

function SearchView({ initialQuery }: { initialQuery: string }) {
  const { search, isIndexing } = useSearchEngine();
  const openCurrent = useTabs((state) => state.openCurrent);

  const [localQuery, setLocalQuery] = useState(initialQuery);
  const [entityFilter, setEntityFilter] = useState<SearchEntityType | null>(
    null,
  );
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [datePreset, setDatePreset] = useState<DatePreset>("any");
  const [searchField, setSearchField] = useState<SearchField>("all");
  const [results, setResults] = useState<LocalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [hasTranscriptFilter, setHasTranscriptFilter] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { atStart, atEnd } = useScrollFade(scrollRef, "vertical", [results]);

  useEffect(() => {
    inputRef.current?.focus();
    const recent = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (recent) {
      setRecentSearches(JSON.parse(recent));
    }
  }, []);

  const sessionIds = main.UI.useRowIds("sessions", main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);
  const indexes = main.UI.useIndexes(main.STORE_ID);

  const folderList = useMemo(() => {
    if (!store || !sessionIds) return [];

    const allFolders = new Set<string>();
    for (const id of sessionIds) {
      const folderId = store.getCell("sessions", id, "folder_id") as string;
      if (folderId) {
        const parts = folderId.split("/");
        for (let i = 1; i <= parts.length; i++) {
          allFolders.add(parts.slice(0, i).join("/"));
        }
      }
    }

    return Array.from(allFolders)
      .sort()
      .map((folderId) => {
        const parts = folderId.split("/");
        return {
          id: folderId,
          name: parts[parts.length - 1] || "Untitled",
        };
      });
  }, [sessionIds, store]);

  const dateRange = useMemo(() => {
    const now = Date.now();
    switch (datePreset) {
      case "today":
        return { gte: now - 24 * 60 * 60 * 1000 };
      case "week":
        return { gte: now - 7 * 24 * 60 * 60 * 1000 };
      case "month":
        return { gte: now - 30 * 24 * 60 * 60 * 1000 };
      case "year":
        return { gte: now - 365 * 24 * 60 * 60 * 1000 };
      default:
        return null;
    }
  }, [datePreset]);

  const parseAdvancedQuery = useCallback((query: string) => {
    const exactMatches: string[] = [];
    const excludeTerms: string[] = [];
    const includeTerms: string[] = [];

    const exactRegex = /"([^"]+)"/g;
    let match;
    let processedQuery = query;

    while ((match = exactRegex.exec(query)) !== null) {
      exactMatches.push(match[1]);
      processedQuery = processedQuery.replace(match[0], "");
    }

    const terms = processedQuery.split(/\s+/).filter((t) => t.length > 0);
    for (const term of terms) {
      if (term.startsWith("-") && term.length > 1) {
        excludeTerms.push(term.slice(1).toLowerCase());
      } else if (term.toUpperCase() !== "AND" && term.toUpperCase() !== "OR") {
        includeTerms.push(term);
      }
    }

    return { exactMatches, excludeTerms, includeTerms };
  }, []);

  const performSearch = useCallback(async () => {
    if (!localQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { exactMatches, excludeTerms, includeTerms } =
        parseAdvancedQuery(localQuery);
      const searchTerms = [...includeTerms, ...exactMatches].join(" ");

      const hits = await search(
        searchTerms,
        dateRange ? { created_at: dateRange } : null,
      );

      let filtered: LocalSearchResult[] = hits.map((hit: SearchHit) => ({
        id: hit.document.id,
        type: hit.document.type,
        title: hit.document.title,
        titleHighlighted: highlightText(hit.document.title, localQuery),
        content: hit.document.content,
        contentHighlighted: highlightText(hit.document.content, localQuery),
        created_at: hit.document.created_at,
        score: hit.score,
      }));

      if (excludeTerms.length > 0) {
        filtered = filtered.filter((r) => {
          const text = `${r.title} ${r.content}`.toLowerCase();
          return !excludeTerms.some((term) => text.includes(term));
        });
      }

      if (exactMatches.length > 0) {
        filtered = filtered.filter((r) => {
          const text = `${r.title} ${r.content}`.toLowerCase();
          return exactMatches.every((phrase) =>
            text.includes(phrase.toLowerCase()),
          );
        });
      }

      if (entityFilter) {
        filtered = filtered.filter((r) => r.type === entityFilter);
      }

      if (searchField === "title") {
        filtered = filtered.filter((r) =>
          r.title.toLowerCase().includes(localQuery.toLowerCase()),
        );
      }

      if (selectedFolderId && store) {
        filtered = filtered.filter((r) => {
          if (r.type !== "session") return true;
          const folderId = store.getCell("sessions", r.id, "folder_id") as
            | string
            | undefined;
          return folderId?.startsWith(selectedFolderId);
        });
      }

      if (hasTranscriptFilter && indexes) {
        filtered = filtered.filter((r) => {
          if (r.type !== "session") return true;
          const transcriptIds = indexes.getSliceRowIds(
            main.INDEXES.transcriptBySession,
            r.id,
          );
          return transcriptIds && transcriptIds.length > 0;
        });
      }

      if (sortBy === "date_desc") {
        filtered.sort((a, b) => b.created_at - a.created_at);
      } else if (sortBy === "date_asc") {
        filtered.sort((a, b) => a.created_at - b.created_at);
      }

      setResults(filtered);
      setSelectedIndex(-1);
    } finally {
      setIsSearching(false);
    }
  }, [
    localQuery,
    search,
    entityFilter,
    sortBy,
    dateRange,
    searchField,
    parseAdvancedQuery,
    selectedFolderId,
    hasTranscriptFilter,
    store,
    indexes,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch();
    }, 200);
    return () => clearTimeout(timer);
  }, [performSearch]);

  const addToRecentSearches = useCallback((query: string) => {
    if (!query.trim()) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== query);
      const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleResultClick = useCallback(
    (result: LocalSearchResult) => {
      addToRecentSearches(localQuery);
      const tab = getTabFromResult(result);
      if (tab) {
        openCurrent(tab);
      }
    },
    [openCurrent, localQuery, addToRecentSearches],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === "Enter") {
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        } else {
          addToRecentSearches(localQuery);
        }
      } else if (e.key === "Escape") {
        inputRef.current?.blur();
        setShowRecentSearches(false);
      }
    },
    [
      results,
      selectedIndex,
      handleResultClick,
      localQuery,
      addToRecentSearches,
    ],
  );

  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.querySelector(
        `[data-result-index="${selectedIndex}"]`,
      );
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  }, []);

  const hasActiveFilters =
    datePreset !== "any" ||
    searchField !== "all" ||
    hasTranscriptFilter ||
    selectedFolderId !== null;

  const activeFilterCount = [
    datePreset !== "any",
    searchField !== "all",
    hasTranscriptFilter,
    selectedFolderId !== null,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col flex-1 w-full overflow-hidden">
      <div className="p-4 space-y-3 border-b border-border/40">
        <div className="relative">
          <SearchIcon
            className={cn([
              "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
              isSearching
                ? "text-muted-foreground/50 animate-pulse"
                : "text-muted-foreground",
            ])}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search notes, transcripts, and contacts..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowRecentSearches(true)}
            onBlur={() => setTimeout(() => setShowRecentSearches(false), 200)}
            className={cn([
              "w-full pl-10 pr-10 py-2",
              "text-sm bg-muted/50 rounded-lg",
              "border border-transparent",
              "focus:outline-none focus:bg-background focus:border-border focus:ring-1 focus:ring-ring/20",
              "placeholder:text-muted-foreground/60",
              "transition-all duration-150",
            ])}
          />
          {localQuery && (
            <button
              onClick={() => setLocalQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}

          <AnimatePresence>
            {showRecentSearches && !localQuery && recentSearches.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 bg-popover rounded-lg shadow-lg border border-border z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <HistoryIcon className="h-3 w-3" />
                    Recent searches
                  </span>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                {recentSearches
                  .slice(0, RECENT_SEARCHES_DISPLAY)
                  .map((query, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setLocalQuery(query);
                        setShowRecentSearches(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 flex items-center gap-2 transition-colors"
                    >
                      <ClockIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{query}</span>
                    </button>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1">
          <div className="inline-flex items-center rounded-lg bg-muted/50 p-0.5">
            <SegmentButton
              active={entityFilter === null}
              onClick={() => setEntityFilter(null)}
            >
              All
            </SegmentButton>
            <SegmentButton
              active={entityFilter === "session"}
              onClick={() =>
                setEntityFilter(entityFilter === "session" ? null : "session")
              }
              icon={<FileTextIcon className="h-3 w-3" />}
            >
              Notes
            </SegmentButton>
            <SegmentButton
              active={entityFilter === "human"}
              onClick={() =>
                setEntityFilter(entityFilter === "human" ? null : "human")
              }
              icon={<UserIcon className="h-3 w-3" />}
            >
              People
            </SegmentButton>
            <SegmentButton
              active={entityFilter === "organization"}
              onClick={() =>
                setEntityFilter(
                  entityFilter === "organization" ? null : "organization",
                )
              }
              icon={<BuildingIcon className="h-3 w-3" />}
            >
              Orgs
            </SegmentButton>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn([
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                  hasActiveFilters
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                ])}
              >
                <SlidersHorizontalIcon className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-3 space-y-3">
              <FilterSection label="Date">
                <div className="flex flex-wrap gap-1">
                  {(
                    ["any", "today", "week", "month", "year"] as DatePreset[]
                  ).map((preset) => (
                    <FilterPill
                      key={preset}
                      active={datePreset === preset}
                      onClick={() => setDatePreset(preset)}
                    >
                      {preset === "any"
                        ? "Any time"
                        : preset === "today"
                          ? "Today"
                          : preset === "week"
                            ? "This week"
                            : preset === "month"
                              ? "This month"
                              : "This year"}
                    </FilterPill>
                  ))}
                </div>
              </FilterSection>

              <FilterSection label="Search in">
                <div className="flex flex-wrap gap-1">
                  <FilterPill
                    active={searchField === "all"}
                    onClick={() => setSearchField("all")}
                  >
                    Everything
                  </FilterPill>
                  <FilterPill
                    active={searchField === "title"}
                    onClick={() => setSearchField("title")}
                  >
                    Titles only
                  </FilterPill>
                </div>
              </FilterSection>

              <FilterSection label="Contains">
                <div className="flex flex-wrap gap-1">
                  <FilterPill
                    active={hasTranscriptFilter}
                    onClick={() => setHasTranscriptFilter(!hasTranscriptFilter)}
                    icon={<FileTextIcon className="h-3 w-3" />}
                  >
                    Transcript
                  </FilterPill>
                </div>
              </FilterSection>

              {folderList.length > 0 && (
                <FilterSection label="Folder">
                  <div className="flex flex-wrap gap-1">
                    <FilterPill
                      active={selectedFolderId === null}
                      onClick={() => setSelectedFolderId(null)}
                    >
                      All
                    </FilterPill>
                    {folderList.slice(0, MAX_FOLDERS_DISPLAY).map((folder) => (
                      <FilterPill
                        key={folder.id}
                        active={selectedFolderId === folder.id}
                        onClick={() =>
                          setSelectedFolderId(
                            selectedFolderId === folder.id ? null : folder.id,
                          )
                        }
                        icon={<FolderIcon className="h-3 w-3" />}
                      >
                        {folder.name}
                      </FilterPill>
                    ))}
                  </div>
                </FilterSection>
              )}

              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setDatePreset("any");
                    setSearchField("all");
                    setHasTranscriptFilter(false);
                    setSelectedFolderId(null);
                  }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground py-1.5 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </PopoverContent>
          </Popover>

          <div className="ml-auto">
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  {sortBy === "relevance"
                    ? "Relevance"
                    : sortBy === "date_desc"
                      ? "Newest"
                      : "Oldest"}
                  <ChevronDownIcon className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-32 p-1">
                <SortOption
                  active={sortBy === "relevance"}
                  onClick={() => setSortBy("relevance")}
                >
                  Relevance
                </SortOption>
                <SortOption
                  active={sortBy === "date_desc"}
                  onClick={() => setSortBy("date_desc")}
                >
                  Newest first
                </SortOption>
                <SortOption
                  active={sortBy === "date_asc"}
                  onClick={() => setSortBy("date_asc")}
                >
                  Oldest first
                </SortOption>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto scrollbar-hide">
          <div ref={resultsRef} className="p-4">
            {isIndexing ? (
              <EmptyState
                icon={<SearchIcon className="h-10 w-10" />}
                title="Building search index..."
                description="This may take a moment"
              />
            ) : isSearching ? (
              <EmptyState
                icon={<SearchIcon className="h-10 w-10 animate-pulse" />}
                title="Searching..."
              />
            ) : !localQuery.trim() ? (
              <EmptyState
                icon={<SearchIcon className="h-10 w-10" />}
                title="Search your workspace"
                description="Find notes, transcripts, and contacts"
              />
            ) : results.length === 0 ? (
              <EmptyState
                icon={<SearchIcon className="h-10 w-10" />}
                title="No results found"
                description={`Try different keywords or check your filters`}
              />
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground mb-3 px-1">
                  {results.length} result{results.length !== 1 ? "s" : ""}
                </p>
                {results.map((result, index) => (
                  <SearchResultCard
                    key={result.id}
                    result={result}
                    isSelected={index === selectedIndex}
                    onClick={() => handleResultClick(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    dataIndex={index}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        {!atStart && <ScrollFadeOverlay position="top" />}
        {!atEnd && <ScrollFadeOverlay position="bottom" />}
      </div>
    </div>
  );
}

function SegmentButton({
  children,
  active,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn([
        "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      ])}
    >
      {icon}
      {children}
    </button>
  );
}

function FilterSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function FilterPill({
  children,
  active,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn([
        "inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
      ])}
    >
      {icon}
      {children}
    </button>
  );
}

function SortOption({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn([
        "w-full px-2 py-1.5 text-left text-xs rounded-md transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      ])}
    >
      {children}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-muted-foreground/40 mb-4">{icon}</div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground/60 mt-1">{description}</p>
      )}
    </div>
  );
}

function SearchResultCard({
  result,
  isSelected,
  onClick,
  onMouseEnter,
  dataIndex,
}: {
  result: LocalSearchResult;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  dataIndex: number;
}) {
  const sanitizedTitle = useMemo(
    () =>
      DOMPurify.sanitize(result.titleHighlighted, {
        ALLOWED_TAGS: ["mark"],
        ALLOWED_ATTR: [],
      }),
    [result.titleHighlighted],
  );

  const snippet = useMemo(() => {
    if (!result.content) return "";

    const markRegex = /<mark\b/;
    const markMatch = result.contentHighlighted.match(markRegex);

    if (markMatch) {
      const markPos = markMatch.index!;
      const contextStart = Math.max(
        0,
        result.contentHighlighted.substring(0, markPos).length -
          SNIPPET_CONTEXT_BEFORE,
      );
      const contextEnd = Math.min(
        result.contentHighlighted.length,
        markPos + SNIPPET_CONTEXT_AFTER,
      );

      const snippetText = result.contentHighlighted.substring(
        contextStart,
        contextEnd,
      );
      const prefix = contextStart > 0 ? "..." : "";
      const suffix = contextEnd < result.contentHighlighted.length ? "..." : "";

      return DOMPurify.sanitize(prefix + snippetText + suffix, {
        ALLOWED_TAGS: ["mark"],
        ALLOWED_ATTR: [],
      });
    }

    return (
      result.content.slice(0, SNIPPET_FALLBACK_LENGTH) +
      (result.content.length > SNIPPET_FALLBACK_LENGTH ? "..." : "")
    );
  }, [result.contentHighlighted, result.content]);

  const TypeIcon = useMemo(() => {
    switch (result.type) {
      case "session":
        return FileTextIcon;
      case "human":
        return UserIcon;
      case "organization":
        return BuildingIcon;
    }
  }, [result.type]);

  const [isHovered, setIsHovered] = useState(false);

  const expandedSnippet = useMemo(() => {
    if (!result.content) return "";
    const preview = result.contentHighlighted.slice(0, 400);
    return DOMPurify.sanitize(
      preview + (result.content.length > 400 ? "..." : ""),
      { ALLOWED_TAGS: ["mark"] },
    );
  }, [result.contentHighlighted, result.content]);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => {
        onMouseEnter();
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      data-result-index={dataIndex}
      className={cn([
        "w-full p-3 text-left rounded-lg transition-all duration-200",
        isSelected ? "bg-muted" : "hover:bg-muted/50",
      ])}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn([
            "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
            result.type === "session"
              ? "bg-blue-500/10 text-blue-600"
              : result.type === "human"
                ? "bg-green-500/10 text-green-600"
                : "bg-purple-500/10 text-purple-600",
          ])}
        >
          <TypeIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-medium text-foreground truncate [&_mark]:bg-yellow-200 [&_mark]:text-yellow-900 [&_mark]:rounded-sm [&_mark]:px-0.5"
            dangerouslySetInnerHTML={{ __html: sanitizedTitle }}
          />
          <div
            className={cn([
              "mt-0.5 text-xs text-muted-foreground [&_mark]:bg-yellow-200 [&_mark]:text-yellow-900 [&_mark]:rounded-sm [&_mark]:px-0.5 transition-all duration-200",
              isHovered ? "line-clamp-none" : "line-clamp-2",
            ])}
            dangerouslySetInnerHTML={{
              __html: isHovered ? expandedSnippet : snippet,
            }}
          />
          <div className="mt-1.5 text-[11px] text-muted-foreground/60">
            {formatTimeAgo(result.created_at)}
          </div>
        </div>
      </div>
    </button>
  );
}

function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;

  const exactMatches: string[] = [];
  const exactRegex = /"([^"]+)"/g;
  let match;
  let cleanQuery = query;

  while ((match = exactRegex.exec(query)) !== null) {
    exactMatches.push(match[1]);
    cleanQuery = cleanQuery.replace(match[0], "");
  }

  const terms = cleanQuery
    .split(/\s+/)
    .filter(
      (t) =>
        t.length > 0 &&
        !t.startsWith("-") &&
        t.toUpperCase() !== "AND" &&
        t.toUpperCase() !== "OR",
    );

  const allTerms = [...terms, ...exactMatches];
  if (allTerms.length === 0) return text;

  let result = text;
  for (const term of allTerms) {
    const regex = new RegExp(`(${escapeRegExp(term)})`, "gi");
    result = result.replace(regex, "<mark>$1</mark>");
  }
  return result;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return new Date(timestamp).toLocaleDateString("en-US", { weekday: "long" });
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  const years = Math.floor(diffDays / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

function getTabFromResult(result: LocalSearchResult): TabInput | null {
  if (result.type === "session") {
    return { type: "sessions", id: result.id };
  }
  if (result.type === "human") {
    return { type: "humans", id: result.id };
  }
  if (result.type === "organization") {
    return { type: "organizations", id: result.id };
  }
  return null;
}
