import { Loader2Icon, SearchIcon, SparklesIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@hypr/ui/components/ui/badge";
import { cn } from "@hypr/utils";

import { useSearchEngine } from "../../../../contexts/search/engine";
import {
  type GroupedSearchResults,
  type SearchEntityType,
  groupSearchResults,
} from "../../../../contexts/search/ui";
import { ResultItem } from "./result-item";

const FILTER_OPTIONS: { type: SearchEntityType; label: string }[] = [
  { type: "session", label: "Meeting note" },
  { type: "human", label: "Person" },
  { type: "organization", label: "Organization" },
];

interface AdvancedSearchViewProps {
  selectedTypes: string[] | null;
  setSelectedTypes: (types: string[] | null) => void;
  onResultClick: (type: string, id: string) => void;
}

export function AdvancedSearchView({
  selectedTypes,
  setSelectedTypes,
  onResultClick,
}: AdvancedSearchViewProps) {
  const { search, isIndexing } = useSearchEngine();
  const [localQuery, setLocalQuery] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GroupedSearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(localQuery);
    }, 50);
    return () => clearTimeout(timer);
  }, [localQuery]);

  useEffect(() => {
    if (query.trim().length < 1) {
      setResults(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    search(query).then((hits) => {
      if (!cancelled) {
        setResults(groupSearchResults(hits, query.trim()));
        setIsSearching(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [query, search]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const toggleFilter = useCallback(
    (type: SearchEntityType) => {
      if (!selectedTypes) {
        setSelectedTypes([type]);
      } else if (selectedTypes.includes(type)) {
        const newTypes = selectedTypes.filter((t) => t !== type);
        setSelectedTypes(newTypes.length > 0 ? newTypes : null);
      } else {
        setSelectedTypes([...selectedTypes, type]);
      }
    },
    [selectedTypes, setSelectedTypes],
  );

  const filteredResults = useMemo(() => {
    if (!results || !selectedTypes || selectedTypes.length === 0) {
      return results;
    }
    return {
      ...results,
      groups: results.groups.filter((group) =>
        selectedTypes.includes(group.type),
      ),
      totalResults: results.groups
        .filter((group) => selectedTypes.includes(group.type))
        .reduce((acc, group) => acc + group.totalCount, 0),
    };
  }, [results, selectedTypes]);

  const showLoading = isSearching || isIndexing;
  const hasQuery = query.trim().length > 0;
  const hasResults = filteredResults && filteredResults.totalResults > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="pr-1 py-1 border-b border-neutral-200">
        <div className="relative">
          {showLoading ? (
            <Loader2Icon className="absolute left-[14px] top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 animate-spin" />
          ) : (
            <SearchIcon className="absolute left-[14px] top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder="Try 'budget', '@john', or '#design'"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className={cn([
              "w-full pl-[38px] pr-8 py-2",
              "text-base placeholder:text-neutral-400",
              "bg-transparent",
              "border-none",
              "focus:outline-none",
              "transition-all",
            ])}
          />
          {localQuery && (
            <button
              onClick={() => setLocalQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <XIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="pl-[14px] pr-3 py-2 border-b border-neutral-200">
        <div className="flex gap-2">
          {FILTER_OPTIONS.map((option) => {
            const isActive = selectedTypes?.includes(option.type);
            return (
              <Badge
                key={option.type}
                variant={isActive ? "default" : "outline"}
                className={cn([
                  "cursor-pointer transition-all",
                  isActive
                    ? "bg-neutral-900 text-white hover:bg-neutral-800"
                    : "bg-white text-neutral-600 hover:bg-neutral-100 border-neutral-200",
                ])}
                onClick={() => toggleFilter(option.type)}
              >
                {option.label}
              </Badge>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!hasQuery ? (
          <SuggestionsView
            results={filteredResults}
            onResultClick={onResultClick}
          />
        ) : hasResults ? (
          <SearchResultsView
            results={filteredResults!}
            onResultClick={onResultClick}
          />
        ) : (
          <NoResultsView query={query} />
        )}
      </div>
    </div>
  );
}

function SuggestionsView({
  results,
  onResultClick,
}: {
  results: GroupedSearchResults | null;
  onResultClick: (type: string, id: string) => void;
}) {
  return (
    <div className="pl-[14px] pr-3 pt-3">
      <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
        <SparklesIcon className="h-4 w-4" />
        <span>Suggestions</span>
      </div>
      {results && results.totalResults > 0 ? (
        <div className="space-y-1">
          {results.groups
            .slice(0, 3)
            .flatMap((group) =>
              group.results
                .slice(0, 5)
                .map((result) => (
                  <ResultItem
                    key={result.id}
                    result={result}
                    onClick={() => onResultClick(result.type, result.id)}
                  />
                )),
            )}
        </div>
      ) : (
        <div className="text-center py-12 text-neutral-400">
          <p>Start typing to search</p>
          <p className="text-sm mt-1">or browse your recent notes</p>
        </div>
      )}
    </div>
  );
}

function SearchResultsView({
  results,
  onResultClick,
}: {
  results: GroupedSearchResults;
  onResultClick: (type: string, id: string) => void;
}) {
  return (
    <div className="pl-[14px] pr-3 pt-3">
      {results.groups.map((group) => (
        <div key={group.key} className="mb-6">
          <h3 className="text-sm font-semibold text-neutral-900 mb-3">
            {group.title}
          </h3>
          <div className="space-y-1">
            {group.results.map((result) => (
              <ResultItem
                key={result.id}
                result={result}
                onClick={() => onResultClick(result.type, result.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function NoResultsView({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12">
      <SearchIcon className="h-12 w-12 text-neutral-200 mb-4" />
      <p className="text-neutral-600 font-medium">No results found</p>
      <p className="text-sm text-neutral-400 mt-1">No matches for "{query}"</p>
    </div>
  );
}
