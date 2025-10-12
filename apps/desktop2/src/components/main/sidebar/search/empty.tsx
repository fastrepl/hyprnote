import { SearchXIcon } from "lucide-react";

import { cn } from "@hypr/ui/lib/utils";

export function SearchNoResults() {
  return (
    <div className={cn(["h-full flex items-center justify-center"])}>
      <div className={cn(["text-center px-4 max-w-xs"])}>
        <div className={cn(["flex justify-center mb-3"])}>
          <SearchXIcon className={cn(["h-10 w-10 text-gray-300"])} />
        </div>
        <p className={cn(["text-sm font-medium text-gray-700"])}>
          No results found
        </p>
        <p className={cn(["text-xs text-gray-500 mt-2 leading-relaxed"])}>
          Try using different keywords or check your spelling. Results are filtered to show only the most relevant
          matches.
        </p>
      </div>
    </div>
  );
}
