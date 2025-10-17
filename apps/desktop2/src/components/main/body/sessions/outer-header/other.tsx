import {
  ClockIcon,
  FileTextIcon,
  FolderIcon,
  Link2Icon,
  LockIcon,
  MicIcon,
  MicOffIcon,
  MoreHorizontalIcon,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";

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
import { Switch } from "@hypr/ui/components/ui/switch";

export function OthersButton(_: { sessionId: string }) {
  const [isLocked, setIsLocked] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // TODO: Get actual folders
  const folders = [
    { id: "1", name: "Work Notes" },
    { id: "2", name: "Personal" },
    { id: "3", name: "Projects" },
  ];

  const handleCopyLink = () => {
    // TODO: Implement copy link functionality
    console.log("Copy link");
  };

  const handleMoveToFolder = () => {
    // TODO: Implement move to folder functionality
    console.log("Move to folder");
  };

  const handleToggleLock = () => {
    setIsLocked(!isLocked);
    // TODO: Implement lock note functionality
    console.log("Toggle lock");
  };

  const handleExportPDF = () => {
    // TODO: Implement export to PDF functionality
    console.log("Export to PDF");
  };

  const handleToggleListening = () => {
    setIsListening(!isListening);
    // TODO: Implement start/stop listening functionality
    console.log("Toggle listening");
  };

  const handleDeleteNote = () => {
    // TODO: Implement delete note functionality
    console.log("Delete note");
  };

  const handleDeleteRecording = () => {
    // TODO: Implement delete recording functionality
    console.log("Delete recording");
  };

  const handleHistory = () => {
    // TODO: Implement history functionality
    console.log("View history");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="text-xs rounded-lg hover:bg-gray-200 size-7 flex items-center justify-center cursor-pointer">
          <MoreHorizontalIcon size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleCopyLink}>
          <Link2Icon />
          <span>Copy link</span>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FolderIcon />
            <span>Move to</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {folders.map((folder) => (
              <DropdownMenuItem key={folder.id} onClick={handleMoveToFolder}>
                <FolderIcon />
                <span>{folder.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuItem onClick={handleToggleLock}>
          <LockIcon />
          <span>Lock note</span>
          <Switch checked={isLocked} onCheckedChange={handleToggleLock} className="ml-auto" />
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleExportPDF}>
          <FileTextIcon />
          <span>Export to PDF</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleToggleListening}>
          {isListening ? <MicOffIcon /> : <MicIcon />}
          <span>{isListening ? "Stop listening" : "Start listening"}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleDeleteNote} className="text-red-600 focus:text-red-600">
          <TrashIcon />
          <span>Delete note</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleDeleteRecording} className="text-red-600 focus:text-red-600">
          <TrashIcon />
          <span>Delete only recording</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleHistory}>
          <ClockIcon />
          <span>History</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
