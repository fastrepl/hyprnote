import { FolderIcon } from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@hypr/ui/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";

import { folderOps } from "../../../../../../store/tinybase/persister/folder-ops";
import * as main from "../../../../../../store/tinybase/store/main";

export function SearchableFolderDropdown({
  sessionId,
  trigger,
}: {
  sessionId: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const folders = main.UI.useResultTable(
    main.QUERIES.visibleFolders,
    main.STORE_ID,
  );

  const handleSelectFolder = useMoveSessionToFolder(sessionId);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px] p-0">
        {Object.keys(folders).length ? (
          <SearchableFolderContent
            folders={folders}
            onSelectFolder={handleSelectFolder}
            setOpen={setOpen}
          />
        ) : (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No folders available
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SearchableFolderSubmenuContent({
  sessionId,
  setOpen,
}: {
  sessionId: string;
  setOpen?: (open: boolean) => void;
}) {
  const folders = main.UI.useResultTable(
    main.QUERIES.visibleFolders,
    main.STORE_ID,
  );

  const handleSelectFolder = useMoveSessionToFolder(sessionId);

  return (
    <DropdownMenuSubContent className="w-[200px] p-0">
      {Object.keys(folders).length ? (
        <SearchableFolderContent
          folders={folders}
          onSelectFolder={handleSelectFolder}
          setOpen={setOpen}
        />
      ) : (
        <div className="py-6 text-center text-sm text-muted-foreground">
          No folders available
        </div>
      )}
    </DropdownMenuSubContent>
  );
}

function SearchableFolderContent({
  folders,
  onSelectFolder,
  setOpen,
}: {
  folders: Record<string, any>;
  onSelectFolder: (folderId: string) => Promise<void>;
  setOpen?: (open: boolean) => void;
}) {
  const handleSelect = async (folderId: string) => {
    await onSelectFolder(folderId);
    setOpen?.(false);
  };

  return (
    <Command>
      <CommandInput placeholder="Search folders..." autoFocus className="h-9" />
      <CommandList>
        <CommandEmpty>No folders found.</CommandEmpty>
        <CommandGroup>
          {Object.entries(folders).map(([folderId, folder]) => (
            <CommandItem
              key={folderId}
              value={folder.name}
              onSelect={() => handleSelect(folderId)}
            >
              <FolderIcon />
              {folder.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

function useMoveSessionToFolder(sessionId: string) {
  return useCallback(
    async (targetFolderId: string) => {
      const result = await folderOps.moveSessionToFolder(
        sessionId,
        targetFolderId,
      );
      if (result.status === "error") {
        console.error("[MoveSession] Failed:", result.error);
      }
    },
    [sessionId],
  );
}
