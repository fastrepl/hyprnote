import { Building2Icon, FileTextIcon, UserIcon } from "lucide-react";

import { cn } from "@hypr/utils";

import type { SearchResult } from "../../../../contexts/search/ui";

const TYPE_ICONS = {
  session: FileTextIcon,
  human: UserIcon,
  organization: Building2Icon,
};

interface ResultItemProps {
  result: SearchResult;
  onClick: () => void;
}

export function ResultItem({ result, onClick }: ResultItemProps) {
  const Icon = TYPE_ICONS[result.type] || FileTextIcon;

  return (
    <button
      onClick={onClick}
      className={cn([
        "w-full flex items-start gap-3 p-3",
        "rounded-lg text-left",
        "hover:bg-neutral-100 transition-colors",
      ])}
    >
      <div className="mt-0.5 shrink-0">
        <Icon className="h-5 w-5 text-neutral-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="font-medium text-neutral-900 truncate"
          dangerouslySetInnerHTML={{ __html: result.titleHighlighted }}
        />
        {result.content && (
          <div
            className="text-sm text-neutral-500 truncate mt-0.5"
            dangerouslySetInnerHTML={{ __html: result.contentHighlighted }}
          />
        )}
      </div>
    </button>
  );
}
