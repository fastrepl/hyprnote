import { useCallback } from "react";
import { Trans } from "@lingui/react/macro";
import { useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { PenIcon } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";

import { Button } from "@hypr/ui/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@hypr/ui/components/ui/tooltip";

export function NewNoteButton() {
  const { navigate } = useRouter();

  const handleClickNewNote = useCallback(() => {
    navigate({ to: "/note/new" });
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
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={clsx("hidden sm:block", "text-xs")}
            onClick={handleClickNewNote}
          >
            <Trans>New Note</Trans>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Create new note (⌘N)</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-neutral-200 sm:hidden"
            onClick={handleClickNewNote}
            aria-label="New Note"
          >
            <PenIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Create new note (⌘N)</p>
        </TooltipContent>
      </Tooltip>
    </>
  );
}
