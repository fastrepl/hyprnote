import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@hypr/ui/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Check, TagIcon } from "lucide-react";
import { Input } from "@hypr/ui/components/ui/input";
import { ChevronRight, Users2Icon } from "lucide-react";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";

import { mockParticipants } from "@/mocks/participants";
import { type Tag, mockTags } from "@/mocks/tags";

export default function Chips() {
  return (
    <div className="-mx-1.5 flex flex-row items-center px-4 pb-4 pt-1">
      <EventChip />
      <div className="mx-1 h-4 w-px bg-border" />
      <ParticipantsChip />
      <div className="mx-1 h-4 w-px bg-border" />
      <TagChips />
    </div>
  );
}

export function EventChip() {
  return (
    <Popover>
      <PopoverTrigger>
        <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100">
          <CalendarIcon size={14} />
          <span className="text-xs">Jan 23</span>
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="shadow-lg">
        <div className="flex flex-col gap-2">
          <div className="font-semibold">예은 X 지헌</div>
          <div className="text-sm text-neutral-600">
            Thu, Jan 23 8:00 PM - 9:00 PM
          </div>
          <button className="mt-2 rounded-md border border-border px-2 py-1 hover:bg-neutral-100">
            View in calendar
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ParticipantsChip() {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Popover>
      <PopoverTrigger>
        <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100">
          <Users2Icon size={14} />
          {mockParticipants.length > 2 && (
            <span className="text-xs">
              {mockParticipants[0].name} +{mockParticipants.length - 1}
            </span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-0 shadow-lg" align="start">
        <div className="space-y-1">
          {mockParticipants.map((option) => (
            <button
              key={option.id}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-neutral-100"
            >
              <div className="flex items-center gap-2">
                <Avatar
                  className="h-6 w-6"
                  style={{ backgroundColor: option.color_hex }}
                >
                  <AvatarFallback className="text-xs">
                    {getInitials(option.name)}
                  </AvatarFallback>
                </Avatar>
                <span>{option.name}</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TagChips() {
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
