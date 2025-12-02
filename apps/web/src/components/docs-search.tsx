import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@hypr/utils";

interface PagefindResult {
  url: string;
  meta: {
    title: string;
  };
  excerpt: string;
}

interface PagefindSearchResult {
  id: string;
  data: () => Promise<PagefindResult>;
}

interface PagefindInstance {
  search: (
    query: string,
  ) => Promise<{ results: PagefindSearchResult[] } | null>;
}

declare global {
  interface Window {
    __pagefind?: PagefindInstance;
  }
}

export function DocsSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PagefindResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pagefind, setPagefind] = useState<PagefindInstance | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.__pagefind) {
      setPagefind(window.__pagefind);
      return;
    }

    if (document.querySelector("script[data-pagefind]")) {
      return;
    }

    const script = document.createElement("script");
    script.type = "module";
    script.dataset.pagefind = "true";
    script.textContent = `
      import * as pagefind from "/pagefind/pagefind.js";
      window.__pagefind = pagefind;
      window.dispatchEvent(new Event("pagefind:loaded"));
    `;

    function onLoaded() {
      if (window.__pagefind) {
        setPagefind(window.__pagefind);
      }
    }

    window.addEventListener("pagefind:loaded", onLoaded);
    document.head.appendChild(script);

    return () => {
      window.removeEventListener("pagefind:loaded", onLoaded);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      setQuery(searchQuery);
      if (!searchQuery.trim() || !pagefind) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setIsOpen(true);

      try {
        const search = await pagefind.search(searchQuery);
        if (search && search.results) {
          const data = await Promise.all(
            search.results.slice(0, 8).map((r) => r.data()),
          );
          setResults(data);
        }
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [pagefind],
  );

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          size={16}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query && setIsOpen(true)}
          placeholder="Search docs..."
          className={cn([
            "w-full pl-9 pr-3 py-2 text-sm",
            "bg-neutral-50 border border-neutral-200 rounded-sm",
            "placeholder:text-neutral-400 text-neutral-700",
            "focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:border-neutral-300",
            "transition-colors",
          ])}
        />
      </div>

      {isOpen && (
        <div
          className={cn([
            "absolute top-full left-0 right-0 mt-1 z-50",
            "bg-white border border-neutral-200 rounded-sm shadow-lg",
            "max-h-80 overflow-y-auto",
          ])}
        >
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-neutral-500">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <ul>
              {results.map((result, index) => (
                <li key={index}>
                  <a
                    href={result.url}
                    onClick={() => setIsOpen(false)}
                    className={cn([
                      "block px-4 py-3 hover:bg-neutral-50 transition-colors",
                      "border-b border-neutral-100 last:border-b-0",
                    ])}
                  >
                    <div className="text-sm font-medium text-neutral-800">
                      {result.meta.title}
                    </div>
                    <div
                      className="text-xs text-neutral-500 mt-1 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: result.excerpt }}
                    />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-sm text-neutral-500">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
