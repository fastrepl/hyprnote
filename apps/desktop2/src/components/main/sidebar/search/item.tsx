import { Building2Icon, FileTextIcon, UserIcon } from "lucide-react";
import { useCallback } from "react";

import { cn } from "@hypr/ui/lib/utils";
import { type SearchResult } from "../../../../contexts/search";
import { useTabs } from "../../../../store/zustand/tabs";

export function SearchResultItem({ result }: { result: SearchResult }) {
  const { openCurrent } = useTabs();
  const handleClick = useCallback(() => {
    switch (result.type) {
      case "session":
        openCurrent({ id: result.id, type: "sessions", active: true, state: { editor: "raw" } });
        break;
      case "human":
        openCurrent({ id: result.id, type: "humans", active: true });
        break;
      case "organization":
        openCurrent({ id: result.id, type: "organizations", active: true });
        break;
    }
  }, [openCurrent, result.id, result.type]);

  const Icon = result.type === "session"
    ? FileTextIcon
    : result.type === "human"
    ? UserIcon
    : Building2Icon;

  return (
    <button
      onClick={handleClick}
      className={cn([
        "w-full px-3 py-2.5",
        "flex items-start gap-3",
        "hover:bg-gray-50 active:bg-gray-100",
        "rounded-lg transition-colors",
        "text-left",
      ])}
    >
      <Icon className={cn(["h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400"])} />
      <div className={cn(["flex-1 min-w-0"])}>
        <div className={cn(["text-sm font-medium text-gray-900 truncate"])}>
          {result.title}
        </div>
        {result.content && (
          <div className={cn(["text-xs text-gray-500 truncate mt-0.5"])}>
            {result.content.slice(0, 80)}...
          </div>
        )}
      </div>
    </button>
  );
}
