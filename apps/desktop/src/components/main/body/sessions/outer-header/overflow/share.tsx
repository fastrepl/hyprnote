import { useMutation, useQuery } from "@tanstack/react-query";
import { platform } from "@tauri-apps/plugin-os";
import { Loader2Icon, ShareIcon } from "lucide-react";
import { type MouseEvent, useCallback } from "react";

import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { DropdownMenuItem } from "@hypr/ui/components/ui/dropdown-menu";

export function ShareAudio({ sessionId }: { sessionId: string }) {
  const isMac = useQuery({
    queryKey: ["platform"],
    queryFn: async () => {
      const p = await platform();
      return p === "macos";
    },
    staleTime: Infinity,
  });

  const audioPath = useQuery({
    queryKey: ["audio", sessionId, "path"],
    queryFn: async () => {
      const result = await miscCommands.audioPath(sessionId);
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: isMac.data === true,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (e: MouseEvent<HTMLDivElement>) => {
      if (!audioPath.data) {
        throw new Error("Audio path not available");
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.bottom;

      const result = await windowsCommands.shareFiles(
        { type: "main" },
        [audioPath.data],
        x,
        y,
        "BottomLeft",
      );

      if (result.status === "error") {
        throw new Error(result.error);
      }
    },
    onError: console.error,
  });

  const handleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      mutate(e);
    },
    [mutate],
  );

  if (!isMac.data) {
    return null;
  }

  return (
    <DropdownMenuItem
      onClick={handleClick}
      disabled={isPending || !audioPath.data}
      className="cursor-pointer"
    >
      {isPending ? <Loader2Icon className="animate-spin" /> : <ShareIcon />}
      <span>{isPending ? "Sharing..." : "Share Audio"}</span>
    </DropdownMenuItem>
  );
}
