import { useState, useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@hypr/ui/components/ui/command";
import { useSearchStore } from "@/stores/use-search-store";

export function SearchPalette() {
  const { isOpen: isOpenStore, toggle: toggleStore } = useSearchStore();
  const [open, setOpen] = useState(isOpenStore);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
    toggleStore();
  }, [toggleStore]);

  useHotkeys(
    "mod+k",
    (event) => {
      event.preventDefault();
      toggle();
    },
    { enableOnFormTags: true },
  );

  return (
    <CommandDialog open={open} onOpenChange={toggle}>
      <CommandInput autoFocus placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>Calendar</CommandItem>
          <CommandItem>Search Emoji</CommandItem>
          <CommandItem>Calculator</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>Profile</CommandItem>
          <CommandItem>Billing</CommandItem>
          <CommandItem>Settings</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
