import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@hypr/ui/components/ui/command";
import { Building, Laptop, Users2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { useSearchPalette } from "@/contexts/search-palette";

export function SearchPalette() {
  const { isOpen, toggle } = useSearchPalette();

  return (
    <CommandDialog open={isOpen} onOpenChange={toggle}>
      <CommandInput autoFocus placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Note">
          <CommandItem>
            <div className="rounded-lg border bg-neutral-100 size-6 grid place-items-center dark:bg-neutral-600 dark:text-neutral-100">
              <Users2 className="size-4" />
            </div>
            Note 1
          </CommandItem>
          <CommandItem>
            <div className="rounded-lg border bg-neutral-100 size-6 grid place-items-center dark:bg-neutral-600 dark:text-neutral-100">
              <Laptop className="size-4" />
            </div>
            Note 2
          </CommandItem>
          <CommandItem>
            <div className="rounded-lg border bg-neutral-100 size-6 grid place-items-center dark:bg-neutral-600 dark:text-neutral-100">
              <Users2 className="size-4" />
            </div>
            Note 3
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Contact">
          <CommandItem>
            <Avatar variant="rounded" className="size-6 border">
              <AvatarFallback
                variant="rounded"
                className="text-xs font-medium bg-neutral-100 dark:bg-neutral-600 dark:text-neutral-100"
              >
                P1
              </AvatarFallback>
            </Avatar>
            Profile 1
          </CommandItem>
          <CommandItem>
            <Avatar variant="rounded" className="size-6 border">
              <AvatarFallback
                variant="rounded"
                className="text-xs font-medium bg-neutral-100 dark:bg-neutral-600 dark:text-neutral-100"
              >
                P2
              </AvatarFallback>
            </Avatar>
            Profile 2
          </CommandItem>
          <CommandItem>
            <Avatar variant="rounded" className="size-6 border">
              <AvatarFallback
                variant="rounded"
                className="text-xs font-medium bg-neutral-100 dark:bg-neutral-600 dark:text-neutral-100"
              >
                P3
              </AvatarFallback>
            </Avatar>
            Profile 3
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Organization">
          <CommandItem>
            <Avatar variant="rounded" className="size-6 border">
              <AvatarFallback
                variant="rounded"
                className="text-xs font-medium bg-neutral-100 dark:bg-neutral-600 dark:text-neutral-100"
              >
                <Building className="size-4" />
              </AvatarFallback>
            </Avatar>
            Acme Inc.
          </CommandItem>
          <CommandItem>
            <Avatar variant="rounded" className="size-6 border">
              <AvatarFallback
                variant="rounded"
                className="text-xs font-medium bg-neutral-100 dark:bg-neutral-600 dark:text-neutral-100"
              >
                <Building className="size-4" />
              </AvatarFallback>
            </Avatar>
            Acme Corp.
          </CommandItem>
          <CommandItem>
            <Avatar variant="rounded" className="size-6 border">
              <AvatarFallback
                variant="rounded"
                className="text-xs font-medium bg-neutral-100 dark:bg-neutral-600 dark:text-neutral-100"
              >
                <Building className="size-4" />
              </AvatarFallback>
            </Avatar>
            Acme Ltd.
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
