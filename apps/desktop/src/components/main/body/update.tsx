import { useQuery } from "@tanstack/react-query";
import { type UnlistenFn } from "@tauri-apps/api/event";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useState } from "react";

import { commands, events } from "@hypr/plugin-updater2";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

export function Update() {
  const [show, setShow] = useState(false);

  const pendingUpdate = useQuery({
    queryKey: ["pending-update"],
    queryFn: async () => {
      const u = await check();
      if (!u) {
        return false;
      }

      const v = await commands.getPendingUpdate();
      return v.status === "ok" ? v.data : null;
    },
    refetchInterval: 30 * 1000,
  });

  useEffect(() => {
    setShow(!!pendingUpdate.data);
  }, [pendingUpdate.data]);

  useEffect(() => {
    let unlisten: null | UnlistenFn = null;
    events.updateReadyEvent
      .listen(({ payload: { version: _ } }) => {
        pendingUpdate.refetch();
      })
      .then((f) => {
        unlisten = f;
      });

    return () => {
      unlisten?.();
      unlisten = null;
    };
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    try {
      const u = await check();
      if (u) {
        await u.download();
        await u.install();
      }
    } catch (error) {
      console.error(error);
    } finally {
      await relaunch();
    }
  }, []);

  if (!show) {
    return null;
  }

  return (
    <Button
      size="sm"
      onClick={handleInstallUpdate}
      className={cn([
        "rounded-full px-3",
        "bg-gradient-to-t from-stone-600 to-stone-500",
        "hover:from-stone-500 hover:to-stone-400",
      ])}
    >
      Install Update
    </Button>
  );
}
