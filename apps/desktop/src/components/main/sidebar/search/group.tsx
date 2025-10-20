import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@hypr/utils";
import { type SearchGroup } from "../../../../contexts/search/ui";
import { SearchResultItem } from "./item";

const ITEMS_PER_PAGE = 3;
const LOAD_MORE_STEP = 5;

export function SearchResultGroup({ group }: { group: SearchGroup }) {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  if (group.totalCount === 0) {
    return null;
  }

  const visibleResults = group.results.slice(0, visibleCount);
  const hasMore = group.totalCount > visibleCount;

  return (
    <div className={cn(["mb-6"])}>
      <div className={cn(["sticky top-0 z-10", "px-2 py-2 mb-2"])}>
        <h3 className={cn(["text-sm font-semibold text-gray-900"])}>
          {group.title}
        </h3>
      </div>
      <div className={cn(["space-y-0.5"])}>
        {visibleResults.map((result) => <SearchResultItem key={result.id} result={result} />)}
      </div>
      {hasMore && (
        <button
          onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_STEP)}
          className={cn([
            "w-full mt-2 px-3 py-2",
            "flex items-center justify-center gap-2",
            "text-xs font-medium text-gray-600",
            "hover:bg-gray-50 active:bg-gray-100",
            "rounded-lg transition-colors",
          ])}
        >
          <span>Load 5 more</span>
          <ChevronDownIcon className={cn(["h-3 w-3"])} />
        </button>
      )}
    </div>
  );
}
