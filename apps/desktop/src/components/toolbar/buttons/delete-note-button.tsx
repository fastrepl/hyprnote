import { Trans } from "@lingui/react/macro";
import { useParams } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { useSession } from "@hypr/utils/contexts";

export function DeleteNoteButton() {
  const param = useParams({ from: "/app/note/$id", shouldThrow: false });
  return param ? <DeleteNoteButtonInNote /> : null;
}

function DeleteNoteButtonInNote() {
  const param = useParams({ from: "/app/note/$id", shouldThrow: true });
  const [open, setOpen] = useState(false);

  const hasContent = useSession(
    param.id,
    (s) =>
      !!s.session?.title ||
      !!s.session?.raw_memo_html ||
      !!s.session?.enhanced_memo_html
  );

  // TODO
  const handleDelete = () => {};

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              disabled={!hasContent}
              variant="ghost"
              size="icon"
              className="hover:bg-neutral-200"
              aria-label="Delete Note"
            >
              <Trash2 className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            <Trans>Delete note</Trans>
          </p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent className="w-60" align="center">
        <div className="w-full mb-4 text-center font-medium">
          <Trans>Are you sure you want to delete this note?</Trans>
        </div>

        <Button variant="destructive" onClick={handleDelete} className="w-full">
          <Trash2 className="size-4" />
          <Trans>Delete</Trans>
        </Button>
      </PopoverContent>
    </Popover>
  );
}
