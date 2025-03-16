import { useNewNote, useSession } from "@/contexts";
import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { Trans } from "@lingui/react/macro";
import { SquarePenIcon } from "lucide-react";
import Shortcut from "../../shortcut";

export function NewNoteButton() {
  const { createNewNote } = useNewNote();
  const disabled = useSession(
    (s) =>
      !s.session?.title
      && !s.session?.raw_memo_html
      && !s.session?.enhanced_memo_html,
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          disabled={disabled}
          variant="ghost"
          size="icon"
          className="hover:bg-neutral-200"
          onClick={createNewNote}
          aria-label="New Note"
        >
          <SquarePenIcon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          <Trans>Create new note</Trans> <Shortcut macDisplay="⌘N" windowsDisplay="Ctrl+N" />
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
