import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, CirclePlus } from "lucide-react";
import { useEffect, useState } from "react";

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
  baseUrl,
  apiKey,
  fallbackModels,
  disabled = false,
  placeholder = "Select a model",
}: {
  value: string;
  onChange: (value: string) => void;
  baseUrl?: string;
  apiKey?: string;
  fallbackModels: string[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: fetchedModels, isLoading } = useQuery({
    queryKey: ["models", baseUrl, apiKey],
    queryFn: () => fetchModels(baseUrl!, apiKey),
    enabled: !!baseUrl,
    staleTime: 5 * 60 * 1000,
  });

  const availableModels = fetchedModels && fetchedModels.length > 0 ? fetchedModels : fallbackModels;

  const options: string[] = availableModels;

  const [canCreate, setCanCreate] = useState(true);
  useEffect(() => {
    const isAlreadyCreated = !options.some((option) => option === query);
    setCanCreate(!!(query && isAlreadyCreated));
  }, [query, options]);

  function handleSelect(option: string) {
    onChange(option);
    setOpen(false);
    setQuery("");
  }

  function handleCreate() {
    if (query) {
      onChange(query);
      setOpen(false);
      setQuery("");
    }
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
            ? (
              <div className="truncate mr-auto">
                {options.includes(value) ? value : value}
              </div>
            )
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
            {query && <CommandAddItem query={query} onCreate={() => handleCreate()} />}
          </CommandEmpty>

          <CommandList>
            <CommandGroup className="overflow-y-auto">
              {options.length === 0 && !query && (
                <div className="py-1.5 pl-8 space-y-1 text-sm">
                  <p>No models</p>
                  <p>Enter a value to create a new one</p>
                </div>
              )}

              {canCreate && <CommandAddItem query={query} onCreate={() => handleCreate()} />}

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
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CommandAddItem({ query, onCreate }: { query: string; onCreate: () => void }) {
  return (
    <div
      tabIndex={0}
      onClick={onCreate}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter") {
          onCreate();
        }
      }}
      className={cn([
        "flex w-full text-blue-500 cursor-pointer text-sm px-2 py-1.5 rounded-sm items-center",
        "hover:bg-blue-200 focus:!bg-blue-200 focus:outline-none",
      ])}
    >
      <CirclePlus className="mr-2 h-4 w-4" />
      Create "{query}"
    </div>
  );
}

async function fetchModels(baseUrl: string, apiKey?: string): Promise<string[]> {
  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseUrl}/models`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
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
    console.error("Error fetching models:", error);
    return [];
  }
}
