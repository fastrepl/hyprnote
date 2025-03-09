import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, TagIcon } from "lucide-react";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@hypr/ui/components/ui/popover";
import { Button } from "@hypr/ui/components/ui/button";
import { useSession } from "@/contexts";

import { commands as dbCommands, type Tag } from "@hypr/plugin-db";

export function TagChip() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");

  const sessionStore = useSession((s) => s.session);

  const tags = useQuery({
    queryKey: ["tags"],
    enabled: !!sessionStore?.id,
    queryFn: () => {
      const id = sessionStore.id;
      return dbCommands.listSessionTags(id);
    },
  });

  const toggleTag = (tag: Tag) => {
    const isSelected = selected.some((t) => t.id === tag.id);
    if (isSelected) {
      setSelected(selected.filter((t) => t.id !== tag.id));
    } else {
      setSelected([...selected, tag]);
    }
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;

    const newTag: Tag = {
      id: String(Date.now()),
      name: newTagName.trim(),
    };

    setSelected([...selected, newTag]);
    setNewTagName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateTag();
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setNewTagName("");
        }
      }}
    >
      <PopoverTrigger>
        <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 dark:hover:text-neutral-100 flex-shrink-0 text-xs">
          <TagIcon size={14} className="flex-shrink-0 dark:text-neutral-100" />
          {selected.length > 0 ? (
            <span className="truncate dark:text-neutral-100">
              {selected[0]?.name}
              {selected.length > 1 && ` +${selected.length - 1}`}
            </span>
          ) : (
            <span className="truncate dark:text-neutral-100">Add tags</span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="overflow-clip p-0 py-2 shadow-lg dark:bg-neutral-800 dark:text-neutral-100"
        align="start"
      >
        <div className="space-y-1">
          {tags.data?.map((tag) => {
            const isSelected = selected.some((t) => t.id === tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
              >
                <div className="rounded px-2 py-0.5 text-sm dark:text-neutral-100">
                  {tag.name}
                </div>
                {isSelected && <Check className="ml-auto h-4 w-4" />}
              </button>
            );
          })}

          {tags.data?.length && (
            <div className="my-2 border-t border-gray-200 dark:border-neutral-700" />
          )}

          <div className="relative pl-1">
            <input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Create new tag..."
              className="min-h-11 w-full rounded-none border-none bg-transparent px-3 py-2 text-sm focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0 dark:text-neutral-100 dark:placeholder:text-neutral-400"
            />
            {newTagName.trim() && (
              <Button
                onClick={handleCreateTag}
                className="absolute right-2 top-1/2 -translate-y-1/2 transform rounded-full bg-white p-1 text-green-500 transition ease-in-out hover:bg-green-500 hover:text-white dark:bg-neutral-700 dark:text-white"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
