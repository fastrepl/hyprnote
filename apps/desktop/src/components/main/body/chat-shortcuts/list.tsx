import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { ChatShortcut } from "@hypr/store";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import * as main from "../../../../store/tinybase/main";

type ChatShortcutWithId = ChatShortcut & { id: string };

type SuggestedShortcut = {
  slug: string;
  title: string;
  description: string;
  category: string;
  prompt: string;
  targets?: string[];
};

function useChatShortcuts(): ChatShortcutWithId[] {
  const shortcuts = main.UI.useResultTable(
    main.QUERIES.visibleChatShortcuts,
    main.STORE_ID,
  );

  return useMemo(() => {
    return Object.entries(shortcuts as Record<string, ChatShortcut>).map(
      ([id, shortcut]) => ({
        id,
        ...shortcut,
      }),
    );
  }, [shortcuts]);
}

function useSuggestedShortcuts() {
  return useQuery({
    queryKey: ["settings", "shortcuts", "suggestions"],
    queryFn: async () => {
      const response = await fetch("https://hyprnote.com/api/shortcuts", {
        headers: { Accept: "application/json" },
      });
      const data: SuggestedShortcut[] = await response.json();
      return data;
    },
  });
}

export function ChatShortcutsListColumn({
  selectedChatShortcut,
  setSelectedChatShortcut,
}: {
  selectedChatShortcut: string | null;
  setSelectedChatShortcut: (id: string | null) => void;
}) {
  const [searchValue, setSearchValue] = useState("");
  const { user_id } = main.UI.useValues(main.STORE_ID);
  const shortcuts = useChatShortcuts();
  const { data: suggestedShortcuts = [] } = useSuggestedShortcuts();

  const setRow = main.UI.useSetRowCallback(
    "chat_shortcuts",
    (p: { id: string; user_id: string; created_at: string; content: string }) =>
      p.id,
    (p: {
      id: string;
      user_id: string;
      created_at: string;
      content: string;
    }) => ({
      user_id: p.user_id,
      created_at: p.created_at,
      content: p.content,
    }),
    [],
    main.STORE_ID,
  );

  const handleAddNew = () => {
    if (!user_id) return;

    const newId = crypto.randomUUID();
    const now = new Date().toISOString();

    setRow({
      id: newId,
      user_id,
      created_at: now,
      content: "",
    });

    setSelectedChatShortcut(newId);
  };

  const handleCloneShortcut = (shortcut: SuggestedShortcut) => {
    if (!user_id) return;

    const newId = crypto.randomUUID();
    const now = new Date().toISOString();

    setRow({
      id: newId,
      user_id,
      created_at: now,
      content: shortcut.prompt,
    });

    setSelectedChatShortcut(newId);
  };

  const filteredUserShortcuts = useMemo(() => {
    if (!searchValue.trim()) {
      return shortcuts;
    }
    const q = searchValue.toLowerCase();
    return shortcuts.filter((s) => s.content?.toLowerCase().includes(q));
  }, [shortcuts, searchValue]);

  const filteredSuggestedShortcuts = useMemo(() => {
    if (!searchValue.trim()) {
      return suggestedShortcuts;
    }
    const q = searchValue.toLowerCase();
    return suggestedShortcuts.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q),
    );
  }, [suggestedShortcuts, searchValue]);

  const hasNoResults =
    filteredUserShortcuts.length === 0 &&
    filteredSuggestedShortcuts.length === 0;

  return (
    <div className="w-full h-full flex flex-col">
      <ShortcutColumnHeader
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onAddNew={handleAddNew}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {hasNoResults ? (
            <div className="text-center py-8 text-neutral-500">
              <MessageSquare
                size={32}
                className="mx-auto mb-2 text-neutral-300"
              />
              <p className="text-sm">
                {searchValue ? "No shortcuts found" : "No shortcuts yet"}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Create shortcuts for quick chat inputs
              </p>
            </div>
          ) : (
            <>
              {filteredUserShortcuts.map((shortcut) => (
                <ChatShortcutItem
                  key={shortcut.id}
                  content={shortcut.content}
                  category="mine"
                  isSelected={selectedChatShortcut === shortcut.id}
                  onClick={() => setSelectedChatShortcut(shortcut.id)}
                />
              ))}
              {filteredSuggestedShortcuts.map((shortcut, index) => (
                <ChatShortcutItem
                  key={`suggested-${index}`}
                  title={shortcut.title}
                  description={shortcut.description}
                  category={shortcut.category}
                  isSelected={false}
                  onClick={() => handleCloneShortcut(shortcut)}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ShortcutColumnHeader({
  searchValue,
  onSearchChange,
  onAddNew,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onAddNew: () => void;
}) {
  const [showSearch, setShowSearch] = useState(false);

  const handleSearchToggle = () => {
    if (showSearch) {
      onSearchChange("");
    }
    setShowSearch(!showSearch);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      onSearchChange("");
      setShowSearch(false);
      e.currentTarget.blur();
    }
  };

  return (
    <div className="@container border-b border-neutral-200">
      <div className="py-2 pl-3 pr-1 flex items-center justify-between h-12 min-w-0">
        <h3 className="text-sm font-medium">Chat Shortcuts</h3>
        <div className="flex items-center flex-shrink-0">
          <Button
            onClick={handleSearchToggle}
            size="icon"
            variant="ghost"
            title="Search"
          >
            <Search size={16} />
          </Button>
          <Button onClick={onAddNew} size="icon" variant="ghost" title="Add">
            <Plus size={16} />
          </Button>
        </div>
      </div>
      {showSearch && (
        <div className="flex items-center gap-2 px-3 border-t bg-white border-neutral-200 h-12">
          <Search className="h-4 w-4 text-neutral-400 flex-shrink-0" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search shortcuts..."
            className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400"
            autoFocus
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange("")}
              className="p-1 rounded hover:bg-neutral-100 transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4 text-neutral-400" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ChatShortcutItem({
  title,
  content,
  description,
  category,
  isSelected,
  onClick,
}: {
  title?: string;
  content?: string;
  description?: string;
  category?: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isMine = category === "mine";

  const displayTitle = isMine
    ? content?.trim()
      ? content.slice(0, 50) + (content.length > 50 ? "..." : "")
      : "Empty shortcut"
    : title || "Untitled";

  return (
    <button
      onClick={onClick}
      className={cn([
        "w-full text-left px-3 py-2 rounded-md text-sm border hover:bg-neutral-100 transition-colors",
        isSelected ? "border-neutral-500 bg-neutral-100" : "border-transparent",
      ])}
    >
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-neutral-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate flex items-center gap-1">
            {displayTitle}
            {isMine && (
              <span className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                Mine
              </span>
            )}
            {category && !isMine && (
              <span className="text-xs text-stone-400 font-mono">
                ({category})
              </span>
            )}
          </div>
          {description && !isMine && (
            <div className="text-xs text-neutral-500 truncate">
              {description}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
