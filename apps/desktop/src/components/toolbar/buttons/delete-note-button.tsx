import { Trans } from "@lingui/react/macro";
import { useParams, useRouter } from "@tanstack/react-router";
import { AlertCircleIcon, TrashIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { useSession } from "@hypr/utils/contexts";

export function DeleteNoteButton() {
  const param = useParams({ from: "/app/note/$id", shouldThrow: false });
  return param ? <DeleteNoteButtonInNote /> : null;
}

function DeleteNoteButtonInNote() {
  const param = useParams({ from: "/app/note/$id", shouldThrow: true });
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Check if note has content to determine if it can be deleted
  const hasContent = useSession(param.id, (s) =>
    !!s.session?.title || 
    !!s.session?.raw_memo_html || 
    !!s.session?.enhanced_memo_html
  );

  const handleDelete = async () => {
    // In a real implementation, this would call an API to delete the note
    // For now, we'll just navigate back to the home page
    setOpen(false);
    await router.navigate({ to: "/app" });
  };

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
              <TrashIcon className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p><Trans>Delete note</Trans></p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent className="w-72" align="end">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="text-destructive size-5 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-sm mb-1"><Trans>Delete Note</Trans></h4>
              <p className="text-muted-foreground text-sm">
                <Trans>Are you sure you want to delete this note? This action cannot be undone.</Trans>
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trans>Delete</Trans>
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
