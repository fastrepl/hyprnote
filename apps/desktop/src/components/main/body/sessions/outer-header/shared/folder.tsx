import { FolderIcon } from "lucide-react";
import { type ReactNode, useCallback, useMemo, useState } from "react";

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

import { getAllFolderIds, getFolderName } from "@hypr/store";

import * as main from "../../../../../../store/tinybase/store/main";

export function SearchableFolderDropdown({
  sessionId,
  trigger,
}: {
  sessionId: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const sessions = main.UI.useTable("sessions", main.STORE_ID);

  const folderIds = useMemo(() => {
    return getAllFolderIds(sessions);
  }, [sessions]);

  const handleSelectFolder = useMoveSessionToFolder(sessionId);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px] p-0">
        {folderIds.length ? (
          <SearchableFolderContent
            folderIds={folderIds}
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
  const sessions = main.UI.useTable("sessions", main.STORE_ID);

  const folderIds = useMemo(() => {
    return getAllFolderIds(sessions);
  }, [sessions]);

  const handleSelectFolder = useMoveSessionToFolder(sessionId);

  return (
    <DropdownMenuSubContent className="w-[200px] p-0">
      {folderIds.length ? (
        <SearchableFolderContent
          folderIds={folderIds}
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
  folderIds,
  onSelectFolder,
  setOpen,
}: {
  folderIds: string[];
  onSelectFolder: (folderId: string) => void;
  setOpen?: (open: boolean) => void;
}) {
  const handleSelect = (folderId: string) => {
    onSelectFolder(folderId);
    setOpen?.(false);
  };

  return (
    <Command>
      <CommandInput placeholder="Search folders..." autoFocus className="h-9" />
      <CommandList>
        <CommandEmpty>No folders found.</CommandEmpty>
        <CommandGroup>
          {folderIds.map((folderId) => {
            const name = getFolderName(folderId);
            return (
              <CommandItem
                key={folderId}
                value={name}
                onSelect={() => handleSelect(folderId)}
              >
                <FolderIcon />
                {name}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

function useMoveSessionToFolder(sessionId: string) {
  const store = main.UI.useStore(main.STORE_ID);

  return useCallback(
    (targetFolderId: string) => {
      store?.setCell("sessions", sessionId, "folder_id", targetFolderId);
    },
    [sessionId, store],
  );
}
