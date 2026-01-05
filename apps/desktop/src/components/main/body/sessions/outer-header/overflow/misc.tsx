import { Icon } from "@iconify-icon/react";
import { useMutation } from "@tanstack/react-query";
import { openPath } from "@tauri-apps/plugin-opener";
import { FolderIcon, Link2Icon, Loader2Icon } from "lucide-react";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";

import { SearchableFolderSubmenuContent } from "../shared/folder";

export function Copy() {
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

export function Folder({
  sessionId,
  setOpen,
}: {
  sessionId: string;
  setOpen?: (open: boolean) => void;
}) {
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

export function ShowInFinder({ sessionId }: { sessionId: string }) {
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const result = await fsSyncCommands.sessionDir(sessionId);
      if (result.status === "error") {
        throw new Error(result.error);
      }
      await openPath(result.data);
    },
  });

  return (
    <DropdownMenuItem
      onClick={(e) => {
        e.preventDefault();
        mutate();
      }}
      disabled={isPending}
      className="cursor-pointer"
    >
      {isPending ? (
        <Loader2Icon className="animate-spin" />
      ) : (
        <Icon icon="ri:finder-line" />
      )}
      <span>{isPending ? "Opening..." : "Show in Finder"}</span>
    </DropdownMenuItem>
  );
}
