import { cn } from "@hypr/ui/lib/utils";
import { type SearchResult } from "../../../../contexts/search";
import { SearchResultItem } from "./item";

export function SearchResultGroup({
  title,
  results,
  icon: Icon,
}: {
  title: string;
  results: SearchResult[];
  icon: React.ComponentType<{ className?: string }>;
}) {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className={cn(["mb-6"])}>
      <div
        className={cn([
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
          {title}
        </h3>
        <span className={cn(["text-xs text-gray-500 font-medium"])}>
          ({results.length})
        </span>
      </div>
      <div className={cn(["space-y-0.5 px-1"])}>
        {results.map((result) => <SearchResultItem key={result.id} result={result} />)}
      </div>
    </div>
  );
}
