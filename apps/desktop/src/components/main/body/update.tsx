import { useQuery } from "@tanstack/react-query";
import { type UnlistenFn } from "@tauri-apps/api/event";
import { relaunch } from "@tauri-apps/plugin-process";
import { useCallback, useEffect, useState } from "react";

import { commands, events } from "@hypr/plugin-updater2";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

export function Update() {
  const { show, version } = useUpdate();

  const handleInstallUpdate = useCallback(async () => {
    if (!version) {
      return;
    }
    await commands.install(version);
    await relaunch();
  }, [version]);

  if (!show) {
    return null;
  }

  return (
    <Button
      size="sm"
      onClick={handleInstallUpdate}
      className={cn([
        "rounded-full px-3",
        "bg-linear-to-t from-stone-600 to-stone-500",
        "hover:from-stone-500 hover:to-stone-400",
      ])}
    >
      Install Update
    </Button>
  );
}

function useUpdate() {
  const [show, setShow] = useState(false);

  const { data, refetch } = useQuery({
    refetchInterval: 60 * 60 * 1000,
    queryKey: ["pending-update"],
    queryFn: async () => {
      const result = await commands.check();
      if (result.status !== "ok" || !result.data) {
        return null;
      }

      const version = result.data;

      const downloadResult = await commands.download(version);
      if (downloadResult.status !== "ok") {
        return null;
      }

      return version;
    },
  });

  useEffect(() => {
    setShow(!!data);
  }, [data]);

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

  return { show, version: data };
}
