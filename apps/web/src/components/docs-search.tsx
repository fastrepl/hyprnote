import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Pagefind,
  PagefindSearchFragment,
} from "vite-plugin-pagefind/types";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@hypr/ui/components/ui/command";
import { cn } from "@hypr/utils";

export function DocsSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PagefindSearchFragment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pagefindRef = useRef<Pagefind | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    (async () => {
      try {
        const pagefind = (await import(
          "/pagefind/pagefind.js"
        )) as unknown as Pagefind;
        if (!cancelled) pagefindRef.current = pagefind;
      } catch {
        // Pagefind not available in dev mode
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: KeyboardEvent) => {
      const isCmdK =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

      const target = event.target as HTMLElement | null;
      if (
        isCmdK &&
        target &&
        !["INPUT", "TEXTAREA"].includes(target.tagName) &&
        !target.isContentEditable
      ) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSearch = useCallback(async (value: string) => {
    setQuery(value);
    if (!value.trim() || !pagefindRef.current) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await pagefindRef.current.search(value);
      if (!res?.results) {
        setResults([]);
        return;
      }
      const data = await Promise.all(
        res.results.slice(0, 10).map((r) => r.data()),
      );
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelect = useCallback((url: string) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    window.location.assign(url);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn([
          "w-full flex items-center justify-between",
          "px-3 py-2 text-sm",
          "bg-neutral-50 border border-neutral-200 rounded-sm",
          "text-neutral-500 hover:bg-neutral-100",
          "transition-colors cursor-pointer",
        ])}
      >
        <span className="flex items-center gap-2">
          <Search size={16} className="text-neutral-400" />
          <span>Search docs...</span>
        </span>
        <span className="text-[11px] rounded border border-neutral-300 px-1.5 py-0.5 text-neutral-400">
          <span className="font-sans">&#8984;</span>K
        </span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search docs..."
          value={query}
          onValueChange={handleSearch}
        />
        <CommandList>
          {isLoading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          )}
          {!isLoading && query && results.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
          {!isLoading && results.length > 0 && (
            <CommandGroup heading="Results">
              {results.map((result) => (
                <CommandItem
                  key={result.url}
                  value={`${result.meta.title} ${result.url}`}
                  onSelect={() => handleSelect(result.url)}
                  className="flex flex-col items-start gap-1 py-3"
                >
                  <div className="text-sm font-medium">{result.meta.title}</div>
                  <div
                    className="text-xs text-muted-foreground line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: result.excerpt }}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
