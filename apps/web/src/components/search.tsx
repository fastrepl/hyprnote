import { useNavigate } from "@tanstack/react-router";
import { FileText, Search as SearchIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@hypr/ui/components/ui/command";
import { cn } from "@hypr/utils";

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

// Context for shared search palette state
const SearchPaletteContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

function useSearchPalette() {
  const ctx = useContext(SearchPaletteContext);
  if (!ctx) {
    throw new Error(
      "useSearchPalette must be used within SearchPaletteProvider",
    );
  }
  return ctx;
}

export function SearchPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Single global Cmd+K handler
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <SearchPaletteContext.Provider value={{ open, setOpen }}>
      {children}
      <SearchCommandPalette open={open} onOpenChange={setOpen} />
    </SearchPaletteContext.Provider>
  );
}

export function SearchTrigger({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "sidebar" | "mobile" | "header";
}) {
  const { setOpen } = useSearchPalette();

  if (variant === "sidebar") {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn([
          "w-full flex items-center gap-2 px-3 py-2",
          "text-sm text-neutral-500",
          "bg-neutral-50 hover:bg-neutral-100",
          "border border-neutral-200 rounded-md",
          "transition-colors",
          className,
        ])}
      >
        <SearchIcon size={16} className="text-neutral-400" />
        <span className="flex-1 text-left">Search docs...</span>
        <kbd
          className={cn([
            "hidden sm:inline-flex h-5 items-center gap-1",
            "rounded border border-neutral-200 bg-white",
            "px-1.5 font-mono text-[10px] font-medium text-neutral-500",
            "select-none",
          ])}
        >
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
    );
  }

  if (variant === "mobile") {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn([
          "w-full flex items-center gap-2 px-3 py-2.5",
          "text-sm text-neutral-500",
          "bg-white border border-neutral-200 rounded-md shadow-sm",
          className,
        ])}
      >
        <SearchIcon size={16} className="text-neutral-400" />
        <span className="flex-1 text-left">Search docs...</span>
      </button>
    );
  }

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn([
          "cursor-pointer flex items-center gap-1.5",
          "text-neutral-400 hover:text-neutral-600",
          "transition-colors",
          className,
        ])}
      >
        <SearchIcon size={16} />
        <kbd
          className={cn([
            "hidden sm:inline-flex h-5 items-center gap-1",
            "rounded border border-neutral-300",
            "bg-linear-to-b from-white to-neutral-100",
            "px-1.5 font-mono text-[10px] font-medium text-neutral-400",
            "shadow-[0_1px_0_0_rgba(0,0,0,0.1),inset_0_1px_0_0_rgba(255,255,255,0.8)]",
            "select-none",
          ])}
        >
          <span className="text-sm">⌘</span>K
        </kbd>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn([
        "flex items-center gap-2 px-3 h-8",
        "text-sm text-neutral-500",
        "bg-neutral-50 hover:bg-neutral-100",
        "border border-neutral-200 rounded-full",
        "transition-colors",
        className,
      ])}
    >
      <SearchIcon size={14} className="text-neutral-400" />
      <span className="hidden lg:inline">Search</span>
      <kbd
        className={cn([
          "hidden lg:inline-flex h-5 items-center gap-1",
          "rounded border border-neutral-200 bg-white",
          "px-1.5 font-mono text-[10px] font-medium text-neutral-500",
          "select-none",
        ])}
      >
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
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
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when palette opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure the portal is mounted
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [open]);

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open, onOpenChange]);

  useEffect(() => {
    const zendeskWidget = document.getElementById("launcher");
    if (zendeskWidget) {
      zendeskWidget.style.display = open ? "none" : "";
    }
  }, [open]);

  const handleSelect = (url: string) => {
    onOpenChange(false);
    setQuery("");
    setResults([]);
    navigate({ to: url });
  };

  if (!open) return null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-x-0 top-[69px] bottom-0 z-9999 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div className="absolute left-1/2 top-[10%] -translate-x-1/2 w-full max-w-xl px-4">
        <div
          className="bg-white rounded-lg border border-neutral-200 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <Command
            shouldFilter={false}
            className="rounded-lg **:[[cmdk-input-wrapper]]:border-b-0"
          >
            <CommandInput
              ref={inputRef}
              placeholder="Search documentation..."
              value={query}
              onValueChange={setQuery}
            />
            <div className="border-t border-neutral-100" />
            <CommandList className="max-h-[400px] px-1">
              {isLoading && (
                <div className="py-6 text-center text-sm text-neutral-500">
                  Searching...
                </div>
              )}
              {!isLoading && query && results.length === 0 && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}
              {!isLoading && results.length > 0 && (
                <CommandGroup
                  heading="Documentation"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-neutral-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                >
                  {results.map((result, index) => (
                    <CommandItem
                      key={`${result.url}-${index}`}
                      value={result.url}
                      onSelect={() => handleSelect(result.url)}
                      className="flex items-start gap-3 px-2 py-3 cursor-pointer rounded-md hover:bg-neutral-100 data-[selected=true]:bg-neutral-100"
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
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function Search() {
  return (
    <SearchPaletteProvider>
      <SearchTrigger />
    </SearchPaletteProvider>
  );
}
