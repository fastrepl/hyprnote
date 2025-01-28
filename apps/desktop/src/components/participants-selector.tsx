import { useState } from "react";
import { Check, Speech, Search } from "lucide-react";
import clsx from "clsx";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@hypr/ui/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { Input } from "@hypr/ui/components/ui/input";

import { type Participant } from "@/types/tauri.gen";

interface ParticipantSelectorProps {
  options: Participant[];
  selected: Participant[];
  handleSelect: (participants: Participant[]) => void;
}

export default function ParticipantsSelector({
  options,
}: ParticipantSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          className="flex flex-row items-center gap-2 rounded-md border border-border px-2 py-1"
        >
          <Speech size={14} />
          <span className="text-xs">Selected Event</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command className="w-full">
          <div className="relative border-b">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder="Search participants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 rounded-b-none border-none pl-8 focus-visible:ring-0"
            />
          </div>
          <CommandList>
            <CommandEmpty>No participants found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={() => {}}
                >
                  {option.name}
                  <Check
                    className={clsx(
                      "ml-auto h-3 w-3",
                      true ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
