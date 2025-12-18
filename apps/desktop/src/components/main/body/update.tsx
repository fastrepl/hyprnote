import { useQuery } from "@tanstack/react-query";
import { type UnlistenFn } from "@tauri-apps/api/event";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useState } from "react";

import { commands, events } from "@hypr/plugin-updater2";
import { Button } from "@hypr/ui/components/ui/button";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/utils";

import { useOTA } from "../sidebar/profile/ota/task";

export function Update() {
  const [show, setShow] = useState(false);
  const { state: otaState } = useOTA();

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

  const { refetch } = pendingUpdate;
  useEffect(() => {
    let unlisten: null | UnlistenFn = null;
    void events.updateReadyEvent
      .listen(({ payload: { version: _ } }) => {
        void refetch();
      })
      .then((f) => {
        unlisten = f;
      });

    return () => {
      unlisten?.();
      unlisten = null;
    };
  }, [refetch]);

  const handleInstallUpdate = useCallback(async () => {
    await commands.installFromCached();
    await relaunch();
  }, []);

  if (otaState === "downloading") {
    return (
      <Button
        size="sm"
        disabled
        className={cn([
          "rounded-full px-3",
          "bg-gradient-to-t from-stone-600 to-stone-500",
        ])}
      >
        <Spinner size={14} className="mr-1.5" />
        Downloading
      </Button>
    );
  }

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
