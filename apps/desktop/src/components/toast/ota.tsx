import * as Sentry from "@sentry/react";
import { useQuery } from "@tanstack/react-query";
import { getName } from "@tauri-apps/api/app";
import { Channel } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import { message } from "@tauri-apps/plugin-dialog";
import { exists } from "@tauri-apps/plugin-fs";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useEffect } from "react";

import { sonnerToast, toast } from "@hypr/ui/components/ui/toast";
import { DownloadProgress } from "./shared";

export default function OtaNotification() {
  const appInApplicationsFolder = useQuery({
    queryKey: ["app-in-applications-folder"],
    queryFn: async () => {
      const name = await getName();
      const path = await join("/Applications", `${name}.app`);
      return exists(path);
    },
  });

  const checkForUpdate = useQuery({
    queryKey: ["check-for-update"],
    queryFn: async () => {
      if (process.env.NODE_ENV === "production") {
        return check();
      }

      return null;
    },
    refetchInterval: 1000 * 60,
  });

  useEffect(() => {
    if (!checkForUpdate.data) {
      return;
    }

    const update = checkForUpdate.data;

    toast({
      id: "ota-notification",
      title: "Update Available",
      content: `Version ${update.version} is available to install`,
      buttons: [
        {
          label: "Update Now",
          onClick: async () => {
            sonnerToast.dismiss("ota-notification");

            const updateChannel = new Channel<number>();
            let totalDownloaded = 0;
            let contentLength: number | undefined;

            toast({
              id: "update-download",
              title: `Downloading Update ${update.version}`,
              content: (
                <div className="space-y-1">
                  <div>This may take a while...</div>
                  <DownloadProgress channel={updateChannel} />
                </div>
              ),
              dismissible: false,
            });

            update.downloadAndInstall((progressEvent) => {
              if (progressEvent.event === "Started") {
                totalDownloaded = 0;
                contentLength = progressEvent.data.contentLength;
              } else if (progressEvent.event === "Progress") {
                totalDownloaded += progressEvent.data.chunkLength;
                const totalSize = contentLength || (50 * 1024 * 1024);
                const progressPercentage = Math.min(Math.round((totalDownloaded / totalSize) * 100), 99);
                updateChannel.onmessage(progressPercentage);
              } else if (progressEvent.event === "Finished") {
                updateChannel.onmessage(100);
              }
            }).then(() => {
              message("The app will now restart", { kind: "info", title: "Update Installed" });
              setTimeout(relaunch, 2000);
            }).catch((err: any) => {
              Sentry.captureException(err);
              if (!appInApplicationsFolder.data) {
                message("Please move the app to the Applications folder and try again", {
                  kind: "error",
                  title: "Update Installation Failed",
                });
              } else {
                message(err, { kind: "error", title: "Update Installation Failed" });
              }
            });
          },
          primary: true,
        },
      ],
      dismissible: true,
    });
  }, [checkForUpdate.data?.available]);

  return null;
}
