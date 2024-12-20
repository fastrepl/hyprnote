import "../../../styles/cmdk.css";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Command } from "cmdk";
import { useTranslation } from "react-i18next";

import { mockNotes } from "../../../mocks/data";

const SearchModal = () => {
  const { t } = useTranslation();
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

  const filteredNotes = mockNotes.filter(
    (note) =>
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
        <Command label={t('search.label')} onKeyDown={handleKeyDown}>
          <Command className="fixed left-[50%] top-[50%] z-[51] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white shadow-lg dark:bg-gray-800">
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder={t('search.placeholder')}
              className="w-full"
              autoFocus
            />
            <Command.List>
              <Command.Empty>{t('search.noResults')}</Command.Empty>
              <Command.Group>
                {filteredNotes.map((note) => (
                  <Command.Item
                    key={note.id}
                    onSelect={() => {
                      navigate(`/note/${note.id}`);
                      setOpen(false);
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
};

export default SearchModal;
