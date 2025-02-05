import { useState } from "react";
import { Check, TagIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { Input } from "@hypr/ui/components/ui/input";

import { type Tag, mockTags } from "@/mocks/tags";

export default function TagChips() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");

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
        <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100">
          <TagIcon size={14} />
          {selected.length > 0 ? (
            <div className="flex items-center text-xs">
              {selected[0].name}
              {selected.length > 1 && (
                <span className="ml-1">+{selected.length - 1}</span>
              )}
            </div>
          ) : (
            <span className="text-xs">Add tags</span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="overflow-clip p-0 shadow-lg" align="start">
        <div className="space-y-1">
          {mockTags.map((tag) => {
            const isSelected = selected.some((t) => t.id === tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-neutral-100"
              >
                <div className="rounded px-2 py-0.5 text-sm">{tag.name}</div>
                {isSelected && <Check className="ml-auto h-4 w-4" />}
              </button>
            );
          })}

          <div className="my-2 border-t border-gray-200" />

          <div className="relative pl-1">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Create new tag..."
              className="rounded-none border-none pr-8 focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0"
            />
            {newTagName.trim() && (
              <button
                onClick={handleCreateTag}
                className="absolute right-2 top-1/2 -translate-y-1/2 transform rounded-full bg-white p-1 text-green-500 transition ease-in-out hover:bg-green-500 hover:text-white"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
