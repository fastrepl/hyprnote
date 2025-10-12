import { ChevronDownIcon } from "lucide-react";

import { cn } from "@hypr/ui/lib/utils";
import { type SearchGroup } from "../../../../contexts/search";
import { useSearch } from "../../../../contexts/search";
import { SearchResultItem } from "./item";

export function SearchResultGroup({
  group,
  icon: Icon,
  rank,
  maxScore,
}: {
  group: SearchGroup;
  icon: React.ComponentType<{ className?: string }>;
  rank: number;
  maxScore: number;
}) {
  const { loadMoreInGroup } = useSearch();

  if (group.totalCount === 0) {
    return null;
  }

  const visibleResults = group.results.slice(0, group.visibleCount);
  const isTopRanked = rank === 1;

  return (
    <div className={cn(["mb-6"])}>
      <div
        className={cn([
          "sticky top-0 z-10",
          "px-3 py-2 mb-2",
          "flex items-center gap-2",
          "bg-gray-50 rounded-lg",
          "border-b border-gray-200",
        ])}
      >
        <Icon className={cn(["h-4 w-4 text-gray-600"])} />
        <h3
          className={cn([
            "text-xs font-semibold text-gray-700",
            "uppercase tracking-wider",
          ])}
        >
          {group.title}
        </h3>
        <span className={cn(["text-xs text-gray-500 font-medium"])}>
          ({group.totalCount})
        </span>
        {isTopRanked && (
          <span
            className={cn([
              "ml-auto",
              "px-2 py-0.5",
              "text-[10px] font-semibold",
              "bg-blue-100 text-blue-700",
              "rounded-full",
            ])}
          >
            Best Match
          </span>
        )}
      </div>
      <div className={cn(["space-y-0.5 px-1"])}>
        {visibleResults.map((result) => <SearchResultItem key={result.id} result={result} maxScore={maxScore} />)}
      </div>
      {group.hasMore && (
        <button
          onClick={() => loadMoreInGroup(group.key)}
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
