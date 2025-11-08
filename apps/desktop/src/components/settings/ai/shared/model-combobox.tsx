import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown, CirclePlus, Eye, EyeOff } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@hypr/ui/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { cn } from "@hypr/utils";
import type { ListModelsResult } from "./list-models";

const filterFunction = (value: string, search: string) => {
  const v = value.toLocaleLowerCase();
  const s = search.toLocaleLowerCase();
  if (v.includes(s)) {
    return 1;
  }
  return 0;
};

export function ModelCombobox({
  providerId,
  value,
  onChange,
  listModels,
  disabled = false,
  placeholder = "Select a model",
}: {
  providerId: string;
  value: string;
  onChange: (value: string) => void;
  listModels: () => Promise<ListModelsResult> | ListModelsResult;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showIgnored, setShowIgnored] = useState(false);

  const { data: fetchedResult, isLoading } = useQuery({
    queryKey: ["models", providerId, listModels],
    queryFn: listModels,
    retry: 3,
    retryDelay: 300,
  });

  const options: string[] = useMemo(() => fetchedResult?.models ?? [], [fetchedResult]);
  const trimmedQuery = query.trim();
  const hasExactMatch = useMemo(
    () => options.some((option) => option.toLocaleLowerCase() === trimmedQuery.toLocaleLowerCase()),
    [options, trimmedQuery],
  );
  const canSelectFreeform = trimmedQuery.length > 0 && !hasExactMatch;

  const handleSelect = useCallback((option: string) => {
    onChange(option);
    setOpen(false);
    setQuery("");
  }, [onChange]);

  const toggleShowIgnored = useCallback(() => setShowIgnored((prev) => !prev), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled || isLoading}
          aria-expanded={open}
          className={cn(["w-full justify-between font-normal bg-white"])}
        >
          {value && value.length > 0
            ? <span className="truncate">{value}</span>
            : <span className="text-muted-foreground">{isLoading ? "Loading models..." : placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
        <Command filter={filterFunction}>
          <CommandInput
            placeholder="Search or create new"
            value={query}
            onValueChange={(value: string) => setQuery(value)}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === "Enter") {
                event.preventDefault();
              }
            }}
          />
          <CommandEmpty>
            <div className="py-1.5 px-2 text-sm text-muted-foreground">
              <p>No models available.</p>
              <p>Type to select any value.</p>
            </div>
          </CommandEmpty>

          <CommandList>
            <CommandGroup className="overflow-y-auto">
              {options.map((option) => (
                <CommandItem
                  key={option}
                  tabIndex={0}
                  value={option}
                  onSelect={() => {
                    handleSelect(option);
                  }}
                  onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                    if (event.key === "Enter") {
                      event.stopPropagation();
                      handleSelect(option);
                    }
                  }}
                  className={cn([
                    "cursor-pointer",
                    "focus:!bg-neutral-200 hover:!bg-neutral-200 aria-selected:bg-transparent",
                  ])}
                >
                  <span className="truncate">{option}</span>
                </CommandItem>
              ))}

              {showIgnored && fetchedResult?.ignored.map((option) => (
                <CommandItem
                  key={`ignored-${option}`}
                  tabIndex={0}
                  value={option}
                  onSelect={() => {
                    handleSelect(option);
                  }}
                  onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                    if (event.key === "Enter") {
                      event.stopPropagation();
                      handleSelect(option);
                    }
                  }}
                  className={cn([
                    "cursor-pointer opacity-50",
                    "focus:!bg-neutral-200 hover:!bg-neutral-200 aria-selected:bg-transparent",
                  ])}
                >
                  <span className="truncate">{option}</span>
                </CommandItem>
              ))}

              {canSelectFreeform && (
                <CommandItem
                  key={`freeform-${trimmedQuery}`}
                  tabIndex={0}
                  value={trimmedQuery}
                  onSelect={() => {
                    handleSelect(trimmedQuery);
                  }}
                  onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                    if (event.key === "Enter") {
                      event.stopPropagation();
                      handleSelect(trimmedQuery);
                    }
                  }}
                  className={cn([
                    "cursor-pointer",
                    "focus:!bg-neutral-200 hover:!bg-neutral-200 aria-selected:bg-transparent",
                  ])}
                >
                  <CirclePlus className="mr-2 h-4 w-4" />
                  <span className="truncate">Select "{trimmedQuery}"</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>

          {fetchedResult && fetchedResult.ignored.length > 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-t flex items-center justify-between">
              <span>
                {showIgnored
                  ? `Showing ${fetchedResult.ignored.length} more items.`
                  : `${fetchedResult.ignored.length} items ignored.`}
              </span>
              <button
                type="button"
                onClick={toggleShowIgnored}
                className="flex items-center gap-1 text-xs hover:text-foreground transition-colors"
              >
                {showIgnored ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showIgnored ? "Hide" : "Show"}
              </button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
