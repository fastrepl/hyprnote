import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, CirclePlus } from "lucide-react";
import { useState } from "react";

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
import { cn } from "@hypr/ui/lib/utils";

export function ModelCombobox({
  value,
  onChange,
  listModels,
  disabled = false,
  placeholder = "Select a model",
}: {
  value: string;
  onChange: (value: string) => void;
  listModels: () => Promise<string[]> | string[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: fetchedModels, isLoading } = useQuery({
    queryKey: ["models", listModels],
    queryFn: async () => {
      try {
        const models = await listModels();
        if (Array.isArray(models)) {
          return models;
        }
      } catch (error) {
        console.error("Error loading models:", error);
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const options: string[] = fetchedModels ?? [];
  const trimmedQuery = query.trim();
  const hasExactMatch = options.some((option) => option.toLocaleLowerCase() === trimmedQuery.toLocaleLowerCase());
  const canSelectFreeform = trimmedQuery.length > 0 && !hasExactMatch;

  function handleSelect(option: string) {
    onChange(option);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled || isLoading}
          aria-expanded={open}
          className="w-full font-normal bg-white"
        >
          {value && value.length > 0
            ? <div className="truncate mr-auto">{value}</div>
            : (
              <div className="text-slate-600 mr-auto">
                {isLoading ? "Loading models..." : placeholder}
              </div>
            )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[400px] p-0">
        <Command
          filter={(value, search) => {
            const v = value.toLocaleLowerCase();
            const s = search.toLocaleLowerCase();
            if (v.includes(s)) {
              return 1;
            }
            return 0;
          }}
        >
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
          <CommandEmpty className="flex pl-1 py-1 w-full">
            <div className="py-1.5 pl-3 space-y-1 text-sm">
              <p>No models available.</p>
              <p>Type to select any value.</p>
            </div>
          </CommandEmpty>

          <CommandList>
            <CommandGroup className="overflow-y-auto">
              {options.length === 0 && !trimmedQuery && (
                <div className="py-1.5 pl-8 space-y-1 text-sm">
                  <p>No models</p>
                  <p>Enter a value to create a new one</p>
                </div>
              )}

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
                    "focus:!bg-blue-200 hover:!bg-blue-200 aria-selected:bg-transparent",
                  ])}
                >
                  <Check
                    className={cn([
                      "mr-2 h-4 w-4 min-h-4 min-w-4",
                      value === option ? "opacity-100" : "opacity-0",
                    ])}
                  />
                  {option}
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
                    "focus:!bg-blue-200 hover:!bg-blue-200 aria-selected:bg-transparent",
                  ])}
                >
                  <CirclePlus className="mr-2 h-4 w-4" />
                  Select "{trimmedQuery}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export const openaiCompatibleListModels = async (baseUrl: string, apiKey: string) => {
  if (!baseUrl) {
    return [];
  }

  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers,
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (data.data && Array.isArray(data.data)) {
      return data.data.map((model: any) => model.id || model.name || String(model));
    }

    if (Array.isArray(data)) {
      return data.map((model: any) => model.id || model.name || String(model));
    }

    return [];
  } catch (error) {
    return [];
  }
};
