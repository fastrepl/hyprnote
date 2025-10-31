import { FileTextIcon, FolderIcon, Link2Icon, MicIcon, MicOffIcon, MoreHorizontalIcon, TrashIcon } from "lucide-react";
import { useCallback, useState } from "react";

import { commands as miscCommands } from "@hypr/plugin-misc";
import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import { useListener } from "../../../../../contexts/listener";
import { useStartListening } from "../../../../../hooks/useStartListening";
import * as main from "../../../../../store/tinybase/main";
import { SearchableFolderSubmenuContent } from "./shared/folder";

export function OverflowButton({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);

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
        <ExportPDF />
        <DropdownMenuSeparator />
        <Listening sessionId={sessionId} />
        <DropdownMenuSeparator />
        <DeleteNote sessionId={sessionId} />
        <DeleteRecording sessionId={sessionId} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Copy() {
  const handleCopyLink = () => {};

  return (
    <DropdownMenuItem
      disabled={true}
      className="cursor-pointer"
      onClick={handleCopyLink}
    >
      <Link2Icon />
      <span>Copy link</span>
    </DropdownMenuItem>
  );
}

function Folder({ sessionId, setOpen }: { sessionId: string; setOpen?: (open: boolean) => void }) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="cursor-pointer">
        <FolderIcon />
        <span>Move to</span>
      </DropdownMenuSubTrigger>
      <SearchableFolderSubmenuContent sessionId={sessionId} setOpen={setOpen} />
    </DropdownMenuSub>
  );
}

function ExportPDF() {
  const handleExportPDF = () => {
    // TODO: Implement export to PDF functionality
    console.log("Export to PDF");
  };

  return (
    <DropdownMenuItem className="cursor-pointer" onClick={handleExportPDF}>
      <FileTextIcon />
      <span>Export to PDF</span>
    </DropdownMenuItem>
  );
}

function Listening({ sessionId }: { sessionId: string }) {
  const { stop, status, activeSessionId } = useListener((state) => ({
    stop: state.stop,
    status: state.status,
    activeSessionId: state.sessionId,
  }));
  const isListening = status !== "inactive" && activeSessionId === sessionId;
  const startListening = useStartListening(sessionId);

  const handleToggleListening = () => {
    if (isListening) {
      stop();
    } else {
      startListening();
    }
  };

  return (
    <DropdownMenuItem className="cursor-pointer" onClick={handleToggleListening}>
      {isListening ? <MicOffIcon /> : <MicIcon />}
      <span>{isListening ? "Stop listening" : "Start listening"}</span>
    </DropdownMenuItem>
  );
}

function DeleteNote({ sessionId }: { sessionId: string }) {
  const deleteRow = main.UI.useDelRowCallback(
    "sessions",
    sessionId,
    main.STORE_ID,
  );

  const handleDeleteNote = useCallback(() => {
    deleteRow();
    miscCommands.audioDelete(sessionId);
  }, [sessionId, deleteRow]);

  return (
    <DropdownMenuItem
      onClick={handleDeleteNote}
      className="text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
    >
      <TrashIcon />
      <span>Delete note</span>
    </DropdownMenuItem>
  );
}

function DeleteRecording({ sessionId }: { sessionId: string }) {
  const handleDeleteRecording = useCallback(() => {
    miscCommands.audioDelete(sessionId);
  }, [sessionId]);

  return (
    <DropdownMenuItem
      onClick={handleDeleteRecording}
      className="text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
    >
      <TrashIcon />
      <span>Delete only recording</span>
    </DropdownMenuItem>
  );
}
