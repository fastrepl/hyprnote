import { Trans } from "@lingui/react/macro";
import { useParams } from "@tanstack/react-router";
import { SquarePenIcon } from "lucide-react";

import { useNewNote } from "@/contexts";
import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { useSession } from "@hypr/utils/contexts";
import Shortcut from "../../shortcut";

export function NewNoteButton() {
  const param = useParams({ from: "/app/note/$id", shouldThrow: false });
  return param ? <NewNoteButtonInNote /> : null;
}

function NewNoteButtonInNote() {
  const param = useParams({ from: "/app/note/$id", shouldThrow: true });

  const disabled = useSession(param.id, (s) =>
    !s.session.title
    && !s.session.raw_memo_html
    && !s.session.enhanced_memo_html
    && !s.session.conversations.length);

  return <ActualButton disabled={disabled} />;
}

function ActualButton({ disabled }: { disabled: boolean }) {
  const { createNewNote } = useNewNote();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          disabled={disabled}
          variant="ghost"
          size="icon"
          className="hover:bg-neutral-200 dark:hover:bg-zinc-800 text-neutral-700 dark:text-neutral-300"
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
