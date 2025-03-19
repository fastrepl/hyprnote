import { Trans } from "@lingui/react/macro";
import { useMatch } from "@tanstack/react-router";
import { SquarePenIcon } from "lucide-react";

import { useNewNote, useSession2 } from "@/contexts";
import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import Shortcut from "../../shortcut";

export function NewNoteButton() {
  const { createNewNote } = useNewNote();

  const match = useMatch({ from: "/app/note/$id/main" });

  if (!match) {
    return null;
  }

  const disabled = useSession2(match.params.id, (s) =>
    !s.session?.title
    && !s.session?.raw_memo_html
    && !s.session?.enhanced_memo_html);

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
