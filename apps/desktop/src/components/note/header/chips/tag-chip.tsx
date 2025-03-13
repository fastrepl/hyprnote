import { useSession } from "@/contexts";
import { useQuery } from "@tanstack/react-query";
import { TagsIcon } from "lucide-react";
import { useState } from "react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";

export function TagChip() {
  const [open, setOpen] = useState(false);
  const sessionId = useSession((s) => s.session?.id);

  const tags = useQuery({
    queryKey: ["tags"],
    enabled: !!sessionId,
    queryFn: () => {
      const id = sessionId!;
      return dbCommands.listSessionTags(id);
    },
  });

  if (!sessionId || tags.isLoading || tags.isError || !tags.data?.length) {
    return null;
  }

  const tagCount = tags.data.length;

  if (tagCount === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100 flex-shrink-0 text-xs">
          <TagsIcon size={14} className="flex-shrink-0" />
          <span className="truncate">
            {tagCount > 1
              ? `${tags.data[0].name} +${tagCount - 1}`
              : tags.data[0].name}
          </span>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="overflow-clip p-0 py-2 shadow-lg"
        align="start"
      >
        <div className="space-y-1">
          {tags.data.map((tag) => (
            <div
              key={tag.id}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5"
            >
              <div className="rounded px-2 py-0.5 text-sm">{tag.name}</div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
