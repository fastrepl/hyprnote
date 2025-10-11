import { PencilIcon } from "lucide-react";
import { Button } from "@hypr/ui/components/ui/button";
import { useTabs } from "../../../store/zustand/tabs";

export function NewNoteButton() {
  const { openNew } = useTabs();

  const handleCreateNote = () => {
    openNew({
      type: "sessions",
      id: crypto.randomUUID(),
      active: true,
      state: { editor: "raw" },
    });
  };

  return (
    <Button
      className="w-full bg-black hover:bg-neutral-800 text-white rounded-lg py-3 flex items-center justify-center gap-2"
      onClick={handleCreateNote}
    >
      <PencilIcon className="w-4 h-4" />
      Create new note
    </Button>
  );
}

