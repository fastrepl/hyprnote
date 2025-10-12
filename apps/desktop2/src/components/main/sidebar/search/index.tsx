import { Building2Icon, FileTextIcon, UserIcon } from "lucide-react";

import { cn } from "@hypr/ui/lib/utils";
import { useSearch } from "../../../../contexts/search";
import { SearchNoResults } from "./empty";
import { SearchResultGroup } from "./group";

const ICON_MAP = {
  session: FileTextIcon,
  human: UserIcon,
  organization: Building2Icon,
};

export function SearchResults() {
  const { results, query } = useSearch();

  if (!query || !results) {
    return null;
  }

  if (results.totalResults === 0) {
    return <SearchNoResults />;
  }

  return (
    <div className={cn(["h-full overflow-y-auto"])}>
      <div className={cn(["px-3 py-3"])}>
        <div className={cn(["px-2 py-2 mb-4"])}>
          <p className={cn(["text-xs text-gray-500 font-medium"])}>
            {results.totalResults} result{results.totalResults !== 1 ? "s" : ""} for "{query}"
          </p>
        </div>

        {results.groups.map((group, index) => (
          <SearchResultGroup
            key={group.key}
            group={group}
            icon={ICON_MAP[group.type]}
            rank={index + 1}
            maxScore={results.maxScore}
          />
        ))}
      </div>
    </div>
  );
}
