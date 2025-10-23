import { FolderIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

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

import * as persisted from "../../../../../../store/tinybase/persisted";

export function SearchableFolderDropdown({ sessionId, trigger }: { sessionId: string; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const folders = persisted.UI.useResultTable(persisted.QUERIES.visibleFolders, persisted.STORE_ID);

  const handleSelectFolder = persisted.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (folderId: string) => ({ folder_id: folderId }),
    [],
    persisted.STORE_ID,
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px] p-0">
        {Object.keys(folders).length
          ? <SearchableFolderContent folders={folders} onSelectFolder={handleSelectFolder} setOpen={setOpen} />
          : <div className="py-6 text-center text-sm text-muted-foreground">No folders available</div>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SearchableFolderSubmenuContent({ sessionId }: { sessionId: string }) {
  const folders = persisted.UI.useResultTable(persisted.QUERIES.visibleFolders, persisted.STORE_ID);

  const handleSelectFolder = persisted.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (folderId: string) => ({ folder_id: folderId }),
    [],
    persisted.STORE_ID,
  );

  return (
    <DropdownMenuSubContent className="w-[200px] p-0">
      {Object.keys(folders).length
        ? <SearchableFolderContent folders={folders} onSelectFolder={handleSelectFolder} />
        : <div className="py-6 text-center text-sm text-muted-foreground">No folders available</div>}
    </DropdownMenuSubContent>
  );
}

function SearchableFolderContent({ folders, onSelectFolder, setOpen }: {
  folders: Record<string, any>;
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
