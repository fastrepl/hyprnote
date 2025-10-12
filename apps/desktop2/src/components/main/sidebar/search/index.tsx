import { Building2Icon, FileTextIcon, UserIcon } from "lucide-react";

import { cn } from "@hypr/ui/lib/utils";
import { useSearch } from "../../../../contexts/search";
import { SearchNoResults } from "./empty";
import { SearchResultGroup } from "./group";

export function SearchResults() {
  const { results, query } = useSearch();

  if (!query || !results) {
    return null;
  }

  const totalResults = results.sessions.length
    + results.humans.length
    + results.organizations.length;

  if (totalResults === 0) {
    return <SearchNoResults />;
  }

  return (
    <div className={cn(["flex-1 overflow-y-auto"])}>
      <div className={cn(["px-3 py-3"])}>
        <div className={cn(["px-2 py-2 mb-4"])}>
          <p className={cn(["text-xs text-gray-500 font-medium"])}>
            {totalResults} result{totalResults !== 1 ? "s" : ""} for "{query}"
          </p>
        </div>

        <SearchResultGroup
          title="Sessions"
          results={results.sessions}
          icon={FileTextIcon}
        />

        <SearchResultGroup
          title="People"
          results={results.humans}
          icon={UserIcon}
        />

        <SearchResultGroup
          title="Organizations"
          results={results.organizations}
          icon={Building2Icon}
        />
      </div>
    </div>
  );
}
