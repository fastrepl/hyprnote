import { useQuery } from "@tanstack/react-query";
import { check } from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useState } from "react";

import { commands, events } from "@hypr/plugin-updater2";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

export function Update() {
  const [show, setShow] = useState(false);

  const pendingUpdate = useQuery({
    queryKey: ["pending-update"],
    queryFn: () => commands.getPendingUpdate(),
    select: (data) => (data.status === "ok" ? data.data : null),
    refetchInterval: 30 * 1000,
  });

  useEffect(() => {
    setShow(!!pendingUpdate.data);
  }, [pendingUpdate.data]);

  useEffect(() => {
    events.updateReadyEvent.listen(({ payload: { version: _ } }) => {
      pendingUpdate.refetch();
    });
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    const u = await check();
    if (u) {
      u.install();
    }
  }, [check]);

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
