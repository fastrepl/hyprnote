import "../../../styles/cmdk.css";

import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";

import { Command } from "cmdk";

export default function SearchModal() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const handleSearchTrigger = () => {
      setOpen(true);
    };

    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener("openSearch", handleSearchTrigger);
    window.addEventListener("keydown", handleKeyboardShortcut);

    return () => {
      window.removeEventListener("openSearch", handleSearchTrigger);
      window.removeEventListener("keydown", handleKeyboardShortcut);
    };
  }, [open]);

  const filteredNotes = ([] as any).filter(
    (note: any) =>
      note.title.toLowerCase().includes(search.toLowerCase()) ||
      note.rawMemo.toLowerCase().includes(search.toLowerCase()),
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setOpen(false);
            }
          }}
        />
      )}
      {open && (
        <Command onKeyDown={handleKeyDown}>
          <Command className="fixed left-[50%] top-[50%] z-[51] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white shadow-lg dark:bg-gray-800">
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder={t`Search`}
              className="w-full"
              autoFocus
            />
            <Command.List>
              <Command.Empty>
                <Trans>No results</Trans>
              </Command.Empty>
              <Command.Group>
                {filteredNotes.map((note: any) => (
                  <Command.Item
                    key={note.id}
                    onSelect={() => {
                      setOpen(false);
                      navigate({
                        to: "/note/$id",
                        params: { id: note.id },
                      });
                    }}
                  >
                    {note.title}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </Command>
      )}
    </>
  );
}
