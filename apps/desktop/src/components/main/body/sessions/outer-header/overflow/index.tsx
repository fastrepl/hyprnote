import { useQuery } from "@tanstack/react-query";
import { MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";

import { commands as miscCommands } from "@hypr/plugin-misc";
import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";

import type { EditorView } from "../../../../../../store/zustand/tabs/schema";
import { useHasTranscript } from "../../shared";
import { DeleteNote, DeleteRecording } from "./delete";
import { ExportPDF } from "./export-pdf";
import { ExportTranscript } from "./export-transcript";
import { Listening } from "./listening";
import { Copy, Folder, ShowInFinder } from "./misc";
import { ShareAudio } from "./share";

export function OverflowButton({
  sessionId,
  currentView,
}: {
  sessionId: string;
  currentView: EditorView;
}) {
  const [open, setOpen] = useState(false);
  const audioExists = useQuery({
    queryKey: ["audio", sessionId, "exist"],
    queryFn: () => miscCommands.audioExist(sessionId),
    select: (result) => {
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });
  const hasTranscript = useHasTranscript(sessionId);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost">
          <MoreHorizontalIcon size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <Copy />
        <Folder sessionId={sessionId} setOpen={setOpen} />
        <ExportPDF sessionId={sessionId} currentView={currentView} />
        {hasTranscript && <ExportTranscript sessionId={sessionId} />}
        <DropdownMenuSeparator />
        <Listening sessionId={sessionId} />
        <DropdownMenuSeparator />
        {audioExists.data && <ShowInFinder sessionId={sessionId} />}
        {audioExists.data && <ShareAudio sessionId={sessionId} />}
        <DeleteNote sessionId={sessionId} />
        {audioExists.data && <DeleteRecording sessionId={sessionId} />}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
