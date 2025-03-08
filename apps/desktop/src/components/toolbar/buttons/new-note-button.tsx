import { SquarePenIcon } from "lucide-react";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@hypr/ui/components/ui/tooltip";
import { useNewNote } from "@/contexts/new-note";
import Shortcut from "../../shortcut";

export function NewNoteButton() {
  const { createNewNote } = useNewNote();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-neutral-200 dark:hover:bg-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100"
          onClick={createNewNote}
          aria-label="New Note"
        >
          <SquarePenIcon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          Create new note <Shortcut macDisplay="⌘N" windowsDisplay="Ctrl+N" />
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
