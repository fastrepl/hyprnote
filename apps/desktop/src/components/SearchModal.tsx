import "../styles/cmdk.css";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { mockNotes } from "../mocks/data";

const SearchModal = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // Toggle the menu when ⌘K is pressed
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

  const filteredNotes = mockNotes.filter(
    (note) =>
      note.title.toLowerCase().includes(search.toLowerCase()) ||
      note.rawMemo.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
    >
      <Command.Input
        value={search}
        onValueChange={setSearch}
        placeholder="Search notes..."
      />
      <Command.List>
        <Command.Empty>No notes found.</Command.Empty>

        <Command.Group heading="Notes">
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
    </Command.Dialog>
  );
};

export default SearchModal;
