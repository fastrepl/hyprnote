import { PencilIcon } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";
import { useTabs } from "../../../store/zustand/tabs";

export function NewNoteButton() {
  const { openNew } = useTabs();

  const handleCreateNote = useCallback(() => {
    openNew({
      type: "sessions",
      id: crypto.randomUUID(),
      active: true,
      state: { editor: "raw" },
    });
  }, [openNew]);

  return (
    <Button
      className={cn(
        "w-full",
        "rounded-lg py-3",
        "flex items-center justify-center gap-2",
        "text-white bg-gray-900 hover:bg-gray-900/90",
      )}
      onClick={handleCreateNote}
    >
      <PencilIcon className="w-4 h-4" />
      Create new note
    </Button>
  );
}
