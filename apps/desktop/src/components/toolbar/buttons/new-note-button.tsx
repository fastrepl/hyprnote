import { useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { SquarePenIcon } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";

import { Button } from "@hypr/ui/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@hypr/ui/components/ui/tooltip";
import Shortcut from "../../shortcut";

export function NewNoteButton() {
  const { navigate } = useRouter();

  const handleClickNewNote = useCallback(() => {
    navigate({ to: "/app" });
  }, []);

  useHotkeys(
    "mod+n",
    (event) => {
      event.preventDefault();
      handleClickNewNote();
    },
    { enableOnFormTags: true },
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-neutral-200"
          onClick={handleClickNewNote}
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
