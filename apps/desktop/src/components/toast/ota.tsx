import * as Sentry from "@sentry/react";
import { useQuery } from "@tanstack/react-query";
import { getName } from "@tauri-apps/api/app";
import { Channel } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import { message } from "@tauri-apps/plugin-dialog";
import { exists } from "@tauri-apps/plugin-fs";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useEffect, useRef } from "react";

import { sonnerToast, toast } from "@hypr/ui/components/ui/toast";
import { useOngoingSession } from "@hypr/utils/contexts";
import { DownloadProgress } from "./shared";

// exported for manual update checks
export async function createUpdateToast(update: any, toastId: string = "ota-notification") {
  const appName = await getName();
  const appPath = await join("/Applications", `${appName}.app`);
  const appInApplicationsFolder = await exists(appPath);

  return {
    id: toastId,
    title: "Update Available",
    content: `Version ${update.version} is available to install`,
    buttons: [
      {
        label: "Update Now",
        onClick: () => handleUpdateInstall(update, toastId, appInApplicationsFolder),
        primary: true,
      },
    ],
    dismissible: true,
  };
}

export async function handleUpdateInstall(update: any, toastId: string, appInApplicationsFolder: boolean) {
  sonnerToast.dismiss(toastId);

  const updateChannel = new Channel<number>();
  let totalDownloaded = 0;
  let contentLength: number | undefined;

  toast({
    id: `${toastId}-download`,
    title: `Downloading Update ${update.version}`,
    content: (
      <div className="space-y-1">
        <div>This may take a while...</div>
        <DownloadProgress channel={updateChannel} />
      </div>
    ),
    dismissible: false,
  });

  update.downloadAndInstall((progressEvent: any) => {
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
    if (!appInApplicationsFolder) {
      message("Please move the app to the Applications folder and try again", {
        kind: "error",
        title: "Update Installation Failed",
      });
    } else {
      message(err, { kind: "error", title: "Update Installation Failed" });
    }
  });
}
// ---export ends---

export default function OtaNotification() {
  // Track dismissed update versions to prevent showing same notification repeatedly
  const dismissedVersions = useRef(new Set<string>());

  // Check if there's an active meeting session
  const ongoingSession = useOngoingSession((state) => ({
    status: state.status,
    sessionId: state.sessionId,
  }));

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
    refetchInterval: 1000 * 60 * 3,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!checkForUpdate.data) {
      return;
    }

    const update = checkForUpdate.data;

    // Don't show notification if this version was already dismissed
    if (dismissedVersions.current.has(update.version)) {
      return;
    }

    // Don't show update notifications during active meetings
    if (ongoingSession.status === "running_active" || ongoingSession.status === "running_paused") {
      return;
    }

    // Mark this version as shown
    dismissedVersions.current.add(update.version);

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
  }, [checkForUpdate.data]);

  return null;
}
