import { FileTextIcon, FolderIcon, Link2Icon, MicIcon, MicOffIcon, MoreHorizontalIcon, TrashIcon } from "lucide-react";
import { useState } from "react";

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
        <DeleteNote />
        <DeleteRecording />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Copy() {
  const handleCopyLink = () => {
    // TODO: Implement copy link functionality
    console.log("Copy link");
  };

  return (
    <DropdownMenuItem className="cursor-pointer" onClick={handleCopyLink}>
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
  const isListening = status === "running_active" && activeSessionId === sessionId;
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

function DeleteNote() {
  const handleDeleteNote = () => {
    // TODO: Implement delete note functionality
    console.log("Delete note");
  };

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

function DeleteRecording() {
  const handleDeleteRecording = () => {
    // TODO: Implement delete recording functionality
    console.log("Delete recording");
  };

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
