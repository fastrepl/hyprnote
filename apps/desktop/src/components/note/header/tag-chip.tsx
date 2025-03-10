import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TagIcon } from "lucide-react";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@hypr/ui/components/ui/popover";
import { useSession } from "@/contexts";

import { commands as dbCommands } from "@hypr/plugin-db";

export function TagChip() {
  const [open, setOpen] = useState(false);
  const sessionStore = useSession((s) => s.session);

  const tags = useQuery({
    queryKey: ["tags"],
    enabled: !!sessionStore?.id,
    queryFn: () => {
      const id = sessionStore.id;
      return dbCommands.listSessionTags(id);
    },
  });

  if (
    !sessionStore?.id ||
    tags.isLoading ||
    tags.isError ||
    !tags.data?.length
  ) {
    return null;
  }

  const tagCount = tags.data.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 dark:hover:text-neutral-100 flex-shrink-0 text-xs">
          <TagIcon size={14} className="flex-shrink-0 dark:text-neutral-100" />
          <span className="truncate dark:text-neutral-100">
            {tagCount} tag{tagCount > 1 ? "s" : ""}
          </span>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="overflow-clip p-0 py-2 shadow-lg dark:bg-neutral-800 dark:text-neutral-100"
        align="start"
      >
        <div className="space-y-1">
          {tags.data.map((tag) => (
            <div
              key={tag.id}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5"
            >
              <div className="rounded px-2 py-0.5 text-sm dark:text-neutral-100">
                {tag.name}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
