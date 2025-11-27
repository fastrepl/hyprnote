import { SearchXIcon } from "lucide-react";

import {
  type GroupedSearchResults,
  useSearch,
} from "../../../../contexts/search/ui";
import { SearchResultGroup } from "./group";

export function SearchResults() {
  const { results, query, setQuery } = useSearch();

  const empty = !query || !results || results.totalResults === 0;

  return (
    <div className="h-full rounded-xl bg-neutral-50">
      {empty ? (
        <SearchNoResults query={query} setQuery={setQuery} />
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
  return (
    <div className="h-full overflow-y-auto">
      <div className="px-3 py-3">
        <div className="px-2 py-2 mb-4">
          <p className="text-xs text-neutral-500 font-medium">
            {results.totalResults} result{results.totalResults !== 1 ? "s" : ""}{" "}
            for "{query}"
          </p>
        </div>

        {results.groups.map((group) => (
          <SearchResultGroup key={group.key} group={group} />
        ))}
      </div>
    </div>
  );
}

function SearchNoResults({
  query,
}: {
  query: string;
  setQuery: (query: string) => void;
}) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center px-4 max-w-xs">
        <div className="flex justify-center mb-3">
          <SearchXIcon className="h-10 w-10 text-neutral-300" />
        </div>
        <p className="text-sm font-medium text-neutral-700">
          No results found for "{query}"
        </p>
        <p className="text-xs text-neutral-500 mt-2 leading-relaxed underline">
          Help us improve search
        </p>
      </div>
    </div>
  );
}
