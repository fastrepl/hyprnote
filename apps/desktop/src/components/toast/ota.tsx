import { useQuery } from "@tanstack/react-query";
import { ask } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useEffect } from "react";

import { toast } from "@hypr/ui/components/ui/toast";

export default function OtaNotification() {
  const checkForUpdate = useQuery({
    queryKey: ["check-for-update"],
    queryFn: () => {
      if (process.env.NODE_ENV === "production") {
        return check();
      }

      return Promise.resolve({
        available: true,
        currentVersion: "0.0.1",
        version: "0.0.2",
      }) as ReturnType<typeof check>;
    },
    refetchInterval: 1000 * 60,
  });

  useEffect(() => {
    if (!checkForUpdate.data?.available) {
      return;
    }

    const update = checkForUpdate.data;

    toast({
      title: "Update Available",
      description: `Version ${update.version} is available to install`,
      buttons: [
        {
          label: "Update Now",
          onClick: async () => {
            const yes = await ask(
              `
                Update to ${update.version} is available!
                Release notes: ${update.body}
                `,
              {
                title: "Update Now!",
                kind: "info",
                okLabel: "Update",
                cancelLabel: "Cancel",
              },
            );

            if (yes && process.env.NODE_ENV === "production") {
              await update.downloadAndInstall();
              await relaunch();
            }
          },
          primary: true,
        },
      ],
      dismissible: true,
    });
  }, [checkForUpdate.data?.available]);

  return null;
}
