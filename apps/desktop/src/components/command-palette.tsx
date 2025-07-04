import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FileTextIcon, CalendarIcon, UserIcon, BuildingIcon, Settings2Icon, ChevronDownIcon, ArrowUpDownIcon, Search } from "lucide-react";
import { 
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@hypr/ui/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hypr/ui/components/ui/select";

import { commands as dbCommands } from "@hypr/plugin-db";
import { useHypr } from "@/contexts/hypr";
import { type SearchMatch } from "@/stores/search";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const highlightText = (text: string, query: string) => {
  if (!query.trim()) return text;
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, index) => 
    part.toLowerCase() === query.toLowerCase() ? (
      <span key={index} className="font-bold text-neutral-900">{part}</span>
    ) : (
      part
    )
  );
};

const extractContentSnippet = (htmlContent: string, query: string) => {
  if (!htmlContent || !query.trim()) return null;
  
  const plainText = htmlContent
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  const lowerText = plainText.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);
  
  if (matchIndex === -1) return null;
  
  const start = Math.max(0, matchIndex - 60);
  const end = Math.min(plainText.length, start + 120);
  
  let snippet = plainText.slice(start, end);
  
  if (start > 0) snippet = '...' + snippet;
  if (end < plainText.length) snippet = snippet + '...';
  
  return snippet;
};

const sortSessionMatches = (matches: SearchMatch[], sortBy: "latest" | "oldest") => {
  return [...matches].sort((a, b) => {
    const dateA = new Date(a.item.created_at).getTime();
    const dateB = new Date(b.item.created_at).getTime();
    
    if (sortBy === "latest") {
      return dateB - dateA; // newest first
    } else {
      return dateA - dateB; // oldest first
    }
  });
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { userId } = useHypr();
  const navigate = useNavigate();
  
  // Local state for command palette only
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState<"latest" | "oldest">("latest");
  const [showConfig, setShowConfig] = useState(false);

  // Local search function (similar to the global one)
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setMatches([]);
      return;
    }

    setIsSearching(true);
    
    try {
      const [sessions, events, humans, organizations] = await Promise.all([
        dbCommands.listSessions({ type: "search", query: searchQuery, limit: 10, user_id: userId }),
        dbCommands.listEvents({ type: "search", query: searchQuery, limit: 5, user_id: userId }),
        dbCommands.listHumans({ search: [3, searchQuery] }),
        dbCommands.listOrganizations({ search: [3, searchQuery] }),
      ]);

      const results: SearchMatch[] = [
        ...sessions.map((session): SearchMatch => ({ type: "session", item: session })),
        ...events.map((event): SearchMatch => ({ type: "event", item: event })),
        ...humans.map((human): SearchMatch => ({ type: "human", item: human })),
        ...organizations.map((org): SearchMatch => ({ type: "organization", item: org })),
      ];

      setMatches(results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Auto-focus when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Clear search when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setMatches([]);
      setShowConfig(false);
    }
  }, [open]);

  // Handle item selection
  const handleSelectItem = (match: SearchMatch) => {
    switch (match.type) {
      case "session":
        navigate({ to: "/app/note/$id", params: { id: match.item.id } });
        break;
      case "event":
        navigate({ to: "/app/new", search: { calendarEventId: match.item.id } });
        break;
      case "human":
        navigate({ to: "/app/human/$id", params: { id: match.item.id } });
        break;
      case "organization":
        navigate({ to: "/app/organization/$id", params: { id: match.item.id } });
        break;
    }
    onOpenChange(false);
  };

  // Group results by type
  const sessionMatches = matches.filter(match => match.type === "session");
  const eventMatches = matches.filter(match => match.type === "event");
  const humanMatches = matches.filter(match => match.type === "human");
  const organizationMatches = matches.filter(match => match.type === "organization");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  useEffect(() => {
    if (open) {
      // Override the hardcoded max-width
      const style = document.createElement('style');
      style.textContent = `
        [role="dialog"][aria-modal="true"] {
          width: 800px !important;
          max-width: 90vw !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, [open]);

  return (
    <CommandDialog 
      open={open} 
      onOpenChange={onOpenChange}
      shouldFilter={false}
    >
      {/* Custom Input with Filter Icon */}
      <div className={`flex items-center px-3 ${!showConfig ? 'border-b' : ''}`} cmdk-input-wrapper="">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <CommandPrimitive.Input
          ref={inputRef}
          className="flex h-11 w-full rounded-lg bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Search notes, events, people..."
          value={query}
          onValueChange={setQuery}
          autoFocus
        />
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="ml-2 p-1 hover:bg-neutral-100 rounded transition-colors"
        >
          <Settings2Icon className="h-4 w-4 text-neutral-500" />
        </button>
      </div>
      
      {/* Configuration Bar - Only show when toggled AND there are results */}
      {showConfig && (
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-3">
            <Select value={sortBy} onValueChange={(value: "latest" | "oldest") => setSortBy(value)}>
              <SelectTrigger className="h-8 border-none bg-transparent shadow-none px-2 text-sm text-neutral-600 hover:bg-neutral-100">
                <div className="flex items-center gap-2">
                  <ArrowUpDownIcon className="h-4 w-4" />
                  <span>Sort</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        
        </div>
      )}

      {/* Only show results area when there's a query */}
      {query && (
        <CommandList className="max-h-96 pb-3">
          <CommandEmpty>
            {isSearching ? "Searching..." : "No results found."}
          </CommandEmpty>

          {/* Notes Section with content snippets */}
          {sessionMatches.length > 0 && (
            <CommandGroup heading="Notes">
              {sortSessionMatches(sessionMatches, sortBy).map((match) => {
                const titleMatches = (match.item.title || "").toLowerCase().includes(query.toLowerCase());
                const snippet = !titleMatches ? extractContentSnippet(
                  match.item.enhanced_memo_html || match.item.raw_memo_html || '', 
                  query
                ) : null;
                
                return (
                  <CommandItem 
                    key={`session-${match.item.id}`}
                    value={`session-${match.item.id}`}
                    className="flex items-start gap-3 py-3"
                    onSelect={() => handleSelectItem(match)}
                  >
                    <FileTextIcon className="h-4 w-4 text-neutral-500 mt-1" />
                    <div className="flex flex-col items-start flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {highlightText(match.item.title || "Untitled Note", query)}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-500 mt-1">
                        {formatDate(match.item.created_at)}
                      </span>
                      {snippet && (
                        <div className="text-xs text-neutral-600 mt-2">
                          {highlightText(snippet, query)}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* Events Section with highlighting */}
          {eventMatches.length > 0 && (
            <>
              {sessionMatches.length > 0 && <CommandSeparator />}
              <CommandGroup heading="Events">
                {eventMatches.map((match) => (
                  <CommandItem 
                    key={`event-${match.item.id}`}
                    value={`event-${match.item.id}`}
                    className="flex items-center gap-3"
                    onSelect={() => handleSelectItem(match)}
                  >
                    <CalendarIcon className="h-4 w-4 text-neutral-500" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">
                        {highlightText(match.item.name, query)}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {formatDate(match.item.start_date)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* People Section with highlighting */}
          {humanMatches.length > 0 && (
            <>
              {(sessionMatches.length > 0 || eventMatches.length > 0) && <CommandSeparator />}
              <CommandGroup heading="People">
                {humanMatches.map((match) => (
                  <CommandItem 
                    key={`human-${match.item.id}`}
                    value={`human-${match.item.id}`}
                    className="flex items-center gap-3"
                    onSelect={() => handleSelectItem(match)}
                  >
                    <UserIcon className="h-4 w-4 text-neutral-500" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">
                        {highlightText(match.item.full_name || "Unknown Person", query)}
                      </span>
                      {match.item.email && (
                        <span className="text-xs text-neutral-500">
                          {highlightText(match.item.email, query)}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Organizations Section with highlighting */}
          {organizationMatches.length > 0 && (
            <>
              {(sessionMatches.length > 0 || eventMatches.length > 0 || humanMatches.length > 0) && <CommandSeparator />}
              <CommandGroup heading="Organizations">
                {organizationMatches.map((match) => (
                  <CommandItem 
                    key={`org-${match.item.id}`}
                    value={`org-${match.item.id}`}
                    className="flex items-center gap-3"
                    onSelect={() => handleSelectItem(match)}
                  >
                    <BuildingIcon className="h-4 w-4 text-neutral-500" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">
                        {highlightText(match.item.name, query)}
                      </span>
                      {match.item.description && (
                        <span className="text-xs text-neutral-500 truncate">
                          {highlightText(match.item.description, query)}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      )}
    </CommandDialog>
  );
}
