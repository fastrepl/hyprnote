import { openUrl } from "@tauri-apps/plugin-opener";
import { ChevronDownIcon, CopyIcon, ExternalLinkIcon, VideoIcon } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import { useMeetingMetadata } from "./shared";

export function MeetingLink({ sessionId }: { sessionId: string }) {
  const meta = useMeetingMetadata(sessionId)!;

  const handleCopyLink = useCallback(() => {
    if (meta.meeting_link) {
      navigator.clipboard.writeText(meta.meeting_link);
    }
  }, [meta.meeting_link]);

  return (
    <div className="flex items-center justify-between gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="shrink-0">
            <VideoIcon size={16} />
            {meta.meeting_link && new URL(meta.meeting_link).hostname}
            <ChevronDownIcon size={16} className="text-neutral-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => openUrl(meta.meeting_link!)}>
            <ExternalLinkIcon size={14} className="mr-2" />
            Open link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyLink}>
            <CopyIcon size={14} className="mr-2" />
            Copy link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        size="sm"
        onClick={() => openUrl(meta.meeting_link!)}
        className="flex-shrink-0 gap-1"
      >
        Join
      </Button>
    </div>
  );
}
