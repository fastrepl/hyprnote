import { Building2Icon, FileTextIcon, UserIcon } from "lucide-react";
import { useCallback } from "react";

import { cn } from "@hypr/ui/lib/utils";
import { type SearchResult } from "../../../../contexts/search";
import { useTabs } from "../../../../store/zustand/tabs";

function getConfidenceLevel(score: number, maxScore: number): {
  label: string;
  color: string;
} {
  const normalizedScore = maxScore > 0 ? score / maxScore : 0;

  if (normalizedScore >= 0.8) {
    return { label: "High", color: "bg-green-500" };
  } else if (normalizedScore >= 0.5) {
    return { label: "Medium", color: "bg-yellow-500" };
  } else {
    return { label: "Low", color: "bg-gray-400" };
  }
}

export function SearchResultItem({
  result,
  maxScore,
}: {
  result: SearchResult;
  maxScore: number;
}) {
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

  const confidence = getConfidenceLevel(result.score, maxScore);

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
        <div className={cn(["flex items-center gap-2 mb-0.5"])}>
          <div
            className={cn([
              "text-sm font-medium text-gray-900 truncate flex-1 [&_mark]:bg-yellow-200 [&_mark]:text-gray-900",
            ])}
            dangerouslySetInnerHTML={{ __html: result.titleHighlighted }}
          />
          <div
            className={cn([
              "flex-shrink-0",
              "w-1.5 h-1.5 rounded-full",
              confidence.color,
            ])}
            title={`${confidence.label} relevance`}
          />
        </div>
        {result.content && (
          <div
            className={cn(["text-xs text-gray-500 truncate mt-0.5 [&_mark]:bg-yellow-200 [&_mark]:text-gray-700"])}
            dangerouslySetInnerHTML={{ __html: result.contentHighlighted.slice(0, 200) }}
          />
        )}
      </div>
    </button>
  );
}
