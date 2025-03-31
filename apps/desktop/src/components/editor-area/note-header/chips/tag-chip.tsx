import { TagsIcon } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";

interface TagChipProps {
  sessionId: string;
  hashtags?: string[];
}

export function TagChip({ sessionId, hashtags = [] }: TagChipProps) {
  const [open, setOpen] = useState(false);

  if (hashtags.length === 0) {
    return null;
  }

  const totalTags = hashtags.length;
  const firstTag = hashtags[0];
  const additionalTags = totalTags - 1;

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
          <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100 flex-shrink-0 text-xs">
            <TagsIcon size={14} className="flex-shrink-0" />
            <span className="truncate">
              {additionalTags > 0
                ? `${firstTag} +${additionalTags}`
                : firstTag}
            </span>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="overflow-clip p-0 py-2 shadow-lg"
          align="start"
        >
          <div className="space-y-1">
            {hashtags.map((tag, index) => (
              <div
                key={`tag-${index}`}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5"
              >
                <div className="rounded px-2 py-0.5 text-sm">{tag}</div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
