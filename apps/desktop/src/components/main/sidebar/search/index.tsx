import { SearchXIcon, SlidersHorizontalIcon } from "lucide-react";
import { useCallback } from "react";

import {
  type GroupedSearchResults,
  useSearch,
} from "../../../../contexts/search/ui";
import { useTabs } from "../../../../store/zustand/tabs";
import { SearchResultGroup } from "./group";

function useOpenAdvancedSearch(query: string) {
  const openCurrent = useTabs((state) => state.openCurrent);
  return useCallback(() => {
    openCurrent({ type: "search", state: { query } });
  }, [openCurrent, query]);
}

export function SearchResults() {
  const { results, query } = useSearch();

  const empty = !query || !results || results.totalResults === 0;

  return (
    <div className="h-full rounded-xl bg-neutral-50">
      {empty ? (
        <SearchNoResults query={query} />
      ) : (
        <SearchYesResults results={results} query={query} />
      )}
    </div>
  );
}

function SearchYesResults({
  results,
  query,
}: {
  results: GroupedSearchResults;
  query: string;
}) {
  const openAdvancedSearch = useOpenAdvancedSearch(query);

  return (
    <div className="h-full overflow-y-auto scrollbar-hide">
      {results.groups.map((group) => (
        <SearchResultGroup key={group.key} group={group} />
      ))}
      <div className="p-3 border-t border-neutral-200">
        <button
          onClick={openAdvancedSearch}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <SlidersHorizontalIcon className="h-3.5 w-3.5" />
          Advanced Search
        </button>
      </div>
    </div>
  );
}

function SearchNoResults({ query }: { query: string }) {
  const openAdvancedSearch = useOpenAdvancedSearch(query);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center px-4 max-w-xs">
        <div className="flex justify-center mb-3">
          <SearchXIcon className="h-10 w-10 text-neutral-300" />
        </div>
        <p className="text-sm font-medium text-neutral-700">
          No results found for "{query}"
        </p>
        <button
          onClick={openAdvancedSearch}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
        >
          <SlidersHorizontalIcon className="h-3 w-3" />
          Try Advanced Search
        </button>
      </div>
    </div>
  );
}
