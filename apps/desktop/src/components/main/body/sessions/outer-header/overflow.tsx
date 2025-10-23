import { FileTextIcon, FolderIcon, Link2Icon, MicIcon, MicOffIcon, MoreHorizontalIcon, TrashIcon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import { useListener } from "../../../../../contexts/listener";
import { useStartListening } from "../../../../../hooks/useStartListening";
import * as persisted from "../../../../../store/tinybase/persisted";

export function OverflowButton({ sessionId }: { sessionId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost">
          <MoreHorizontalIcon size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <Copy />
        <Folder sessionId={sessionId} />
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

function Folder({ sessionId }: { sessionId: string }) {
  const folders = persisted.UI.useResultTable(persisted.QUERIES.visibleFolders, persisted.STORE_ID);

  const handleMoveToFolder = persisted.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (folderId: string) => ({ folder_id: folderId }),
    [],
    persisted.STORE_ID,
  );

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="cursor-pointer">
        <FolderIcon />
        <span>Move to</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {Object.keys(folders).length
          ? Object.entries(folders).map(([folderId, folder]) => (
            <DropdownMenuItem
              key={folderId}
              className="cursor-pointer"
              onClick={() => handleMoveToFolder(folderId)}
            >
              <FolderIcon />
              {folder.name}
            </DropdownMenuItem>
          ))
          : <DropdownMenuItem disabled>No folders available</DropdownMenuItem>}
      </DropdownMenuSubContent>
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
  const { stop, isListening } = useListener((state) => ({
    stop: state.stop,
    isListening: state.status === "running_active",
  }));
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
