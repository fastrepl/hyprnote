import { Command as CommandPrimitive } from "cmdk";
import { FileTextIcon, SearchIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Kbd } from "@hypr/ui/components/ui/kbd";
import { cn } from "@hypr/utils";

import * as main from "../../../../store/tinybase/store/main";
import { useTabs } from "../../../../store/zustand/tabs";

interface OpenNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpenNoteDialog({ open, onOpenChange }: OpenNoteDialogProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const openCurrent = useTabs((state) => state.openCurrent);

  const sessionIds = main.UI.useRowIds("sessions", main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);

  const sessions = useMemo(() => {
    if (!store || !sessionIds) return [];

    return sessionIds
      .map((id) => ({
        id,
        title: (store.getCell("sessions", id, "title") as string) || "Untitled",
        createdAt: store.getCell("sessions", id, "created_at") as string,
      }))
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }, [sessionIds, store]);

  const filteredSessions = useMemo(() => {
    if (!query.trim()) return sessions;
    const lowerQuery = query.toLowerCase();
    return sessions.filter((s) => s.title.toLowerCase().includes(lowerQuery));
  }, [sessions, query]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const handleSelect = useCallback(
    (sessionId: string) => {
      onOpenChange(false);
      openCurrent({ type: "sessions", id: sessionId });
    },
    [onOpenChange, openCurrent],
  );

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/20 backdrop-blur-xs"
      onClick={() => onOpenChange(false)}
    >
      <div className="absolute left-1/2 top-[15%] -translate-x-1/2 w-full max-w-lg px-4">
        <div
          className={cn([
            "bg-[#faf8f5] rounded-xl border border-neutral-200/80",
            "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]",
            "overflow-hidden",
          ])}
          onClick={(e) => e.stopPropagation()}
        >
          <CommandPrimitive
            shouldFilter={false}
            className="flex flex-col"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onOpenChange(false);
              }
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200/60">
              <SearchIcon className="w-4 h-4 text-neutral-400 shrink-0" />
              <CommandPrimitive.Input
                ref={inputRef}
                value={query}
                onValueChange={setQuery}
                placeholder="Find a note..."
                className={cn([
                  "flex-1 text-sm bg-transparent",
                  "outline-hidden placeholder:text-neutral-400",
                ])}
              />
              <button
                onClick={() => onOpenChange(false)}
                className={cn([
                  "w-5 h-5 rounded-full",
                  "flex items-center justify-center",
                  "bg-neutral-200/80 hover:bg-neutral-300/80",
                  "text-neutral-500 text-xs",
                  "transition-colors",
                ])}
              >
                ×
              </button>
            </div>

            <CommandPrimitive.List className="max-h-80 overflow-y-auto p-2">
              {filteredSessions.length === 0 ? (
                <CommandPrimitive.Empty className="py-6 text-center text-sm text-neutral-500">
                  No notes found.
                </CommandPrimitive.Empty>
              ) : (
                filteredSessions.map((session) => (
                  <CommandPrimitive.Item
                    key={session.id}
                    value={session.id}
                    onSelect={() => handleSelect(session.id)}
                    className={cn([
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                      "text-sm text-neutral-700",
                      "data-[selected=true]:bg-neutral-200/60",
                      "transition-colors",
                    ])}
                  >
                    <FileTextIcon className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="truncate">{session.title}</span>
                  </CommandPrimitive.Item>
                ))
              )}
            </CommandPrimitive.List>

            <div
              className={cn([
                "flex items-center justify-center gap-4 px-4 py-2.5",
                "border-t border-neutral-200/60",
                "text-xs text-neutral-400",
              ])}
            >
              <span className="flex items-center gap-1.5">
                <Kbd className="text-[10px]">↑↓</Kbd>
                <span>to navigate</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd className="text-[10px]">↵</Kbd>
                <span>to open</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd className="text-[10px]">esc</Kbd>
                <span>to dismiss</span>
              </span>
            </div>
          </CommandPrimitive>
        </div>
      </div>
    </div>,
    document.body,
  );
}
