import { useNavigate } from "@tanstack/react-router";
import { FileText, Search as SearchIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@hypr/ui/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@hypr/ui/components/ui/dialog";

interface SearchResult {
  url: string;
  meta: {
    title?: string;
  };
  excerpt: string;
}

interface PagefindResult {
  url: string;
  meta: {
    title?: string;
  };
  excerpt: string;
}

interface PagefindSearchResult {
  id: string;
  data: () => Promise<PagefindResult>;
}

interface PagefindInstance {
  search: (query: string) => Promise<{ results: PagefindSearchResult[] }>;
}

export function SearchTrigger({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "sidebar" | "mobile";
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (variant === "sidebar") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-500 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-md transition-colors ${className}`}
        >
          <SearchIcon size={16} className="text-neutral-400" />
          <span className="flex-1 text-left">Search docs...</span>
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-neutral-200 bg-white px-1.5 font-mono text-[10px] font-medium text-neutral-500">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
        <SearchCommandPalette open={open} onOpenChange={setOpen} />
      </>
    );
  }

  if (variant === "mobile") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-neutral-500 bg-white border border-neutral-200 rounded-md shadow-sm ${className}`}
        >
          <SearchIcon size={16} className="text-neutral-400" />
          <span className="flex-1 text-left">Search docs...</span>
        </button>
        <SearchCommandPalette open={open} onOpenChange={setOpen} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 px-3 h-8 text-sm text-neutral-500 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-full transition-colors ${className}`}
      >
        <SearchIcon size={14} className="text-neutral-400" />
        <span className="hidden lg:inline">Search</span>
        <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-neutral-200 bg-white px-1.5 font-mono text-[10px] font-medium text-neutral-500">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <SearchCommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}

function SearchCommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagefind, setPagefind] = useState<PagefindInstance | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadPagefind = async () => {
      try {
        const pagefindPath = "/pagefind/pagefind.js";
        const pf = await import(/* @vite-ignore */ pagefindPath);
        setPagefind(pf);
      } catch {
        console.error("Failed to load pagefind");
      }
    };

    if (open && !pagefind) {
      loadPagefind();
    }
  }, [open, pagefind]);

  const search = useCallback(
    async (searchQuery: string) => {
      if (!pagefind || !searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const searchResults = await pagefind.search(searchQuery);
        const data = await Promise.all(
          searchResults.results.slice(0, 10).map(async (result) => {
            const resultData = await result.data();
            return {
              url: resultData.url,
              meta: resultData.meta,
              excerpt: resultData.excerpt,
            };
          }),
        );
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [pagefind],
  );

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      search(query);
    }, 200);

    return () => clearTimeout(debounceTimer);
  }, [query, search]);

  const handleSelect = (url: string) => {
    onOpenChange(false);
    setQuery("");
    setResults([]);
    navigate({ to: url });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 max-w-xl">
        <DialogTitle className="sr-only">Search documentation</DialogTitle>
        <Command shouldFilter={false} className="rounded-lg border-0">
          <CommandInput
            placeholder="Search documentation..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[400px]">
            {isLoading && (
              <div className="py-6 text-center text-sm text-neutral-500">
                Searching...
              </div>
            )}
            {!isLoading && query && results.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            {!isLoading && results.length > 0 && (
              <CommandGroup heading="Documentation">
                {results.map((result, index) => (
                  <CommandItem
                    key={`${result.url}-${index}`}
                    value={result.url}
                    onSelect={() => handleSelect(result.url)}
                    className="flex items-start gap-3 py-3 cursor-pointer"
                  >
                    <FileText
                      size={16}
                      className="mt-0.5 text-neutral-400 shrink-0"
                    />
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-medium text-neutral-900 truncate">
                        {result.meta?.title || result.url}
                      </span>
                      {result.excerpt && (
                        <span
                          className="text-xs text-neutral-500 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: result.excerpt }}
                        />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!query && (
              <div className="py-6 text-center text-sm text-neutral-500">
                Type to search documentation...
              </div>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export function Search() {
  return <SearchTrigger />;
}
