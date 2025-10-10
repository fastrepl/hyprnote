import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { createStore } from "@xstate/store";
import { useSelector } from "@xstate/store/react";
import { clsx } from "clsx";
import { AlertCircle, CheckCircle, Download, Loader2, RefreshCw, X } from "lucide-react";
import { useEffect } from "react";

import { MenuItem } from "./shared";

type State =
  | "idle"
  | "checking"
  | "error"
  | "noUpdate"
  | "available"
  | "downloading"
  | "ready"
  | "installing";

interface Context {
  update: Update | null;
  error: string | null;
  downloadProgress: {
    downloaded: number;
    total: number | null;
    percentage: number;
  };
  state: State;
}

const updateStore = createStore({
  context: {
    update: null,
    error: null,
    downloadProgress: {
      downloaded: 0,
      total: null,
      percentage: 0,
    },
    state: "idle" as State,
  } as Context,
  on: {
    setState: (context, event: { state: State }) => ({
      ...context,
      state: event.state,
    }),
    checkSuccess: (context, event: { update: Update | null }) => ({
      ...context,
      update: event.update,
      error: null,
      state: event.update ? ("available" as State) : ("noUpdate" as State),
    }),
    checkError: (context, event: { error: string }) => ({
      ...context,
      error: event.error,
      update: null,
      state: "error" as State,
    }),
    startDownload: (context) => ({
      ...context,
      downloadProgress: {
        downloaded: 0,
        total: null,
        percentage: 0,
      },
      state: "downloading" as State,
    }),
    downloadProgress: (context, event: { chunkLength: number; contentLength?: number }) => ({
      ...context,
      downloadProgress: {
        downloaded: context.downloadProgress.downloaded + event.chunkLength,
        total: event.contentLength ?? context.downloadProgress.total,
        percentage: event.contentLength || context.downloadProgress.total
          ? Math.round(
            ((context.downloadProgress.downloaded + event.chunkLength)
              / (event.contentLength ?? context.downloadProgress.total ?? 1))
              * 100,
          )
          : 0,
      },
    }),
    downloadFinished: (context) => ({
      ...context,
      state: "ready" as State,
    }),
    cancelDownload: (context) => ({
      ...context,
      update: null,
      downloadProgress: {
        downloaded: 0,
        total: null,
        percentage: 0,
      },
      state: "idle" as State,
    }),
    setInstalling: (context) => ({
      ...context,
      state: "installing" as State,
    }),
    reset: (context) => ({
      ...context,
      update: null,
      error: null,
      downloadProgress: {
        downloaded: 0,
        total: null,
        percentage: 0,
      },
      state: "idle" as State,
    }),
  },
});

export function UpdateChecker() {
  const snapshot = useSelector(updateStore, (state) => state.context);
  const { state, update, error, downloadProgress } = snapshot;

  const handleCheckForUpdate = async () => {
    updateStore.trigger.setState({ state: "checking" });

    try {
      const update = await check();
      updateStore.trigger.checkSuccess({ update });

      if (!update) {
        setTimeout(() => {
          const currentState = updateStore.getSnapshot().context.state;
          if (currentState === "noUpdate") {
            updateStore.trigger.reset();
          }
        }, 2000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to check for updates";
      updateStore.trigger.checkError({ error: errorMessage });
    }
  };

  const handleStartDownload = async () => {
    if (!update) {
      return;
    }

    updateStore.trigger.startDownload();

    try {
      await update.download((event) => {
        if (event.event === "Started") {
          updateStore.trigger.downloadProgress({
            chunkLength: 0,
            contentLength: event.data.contentLength,
          });
        } else if (event.event === "Progress") {
          updateStore.trigger.downloadProgress({
            chunkLength: event.data.chunkLength,
          });
        } else if (event.event === "Finished") {
          updateStore.trigger.downloadFinished();
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Download failed";
      updateStore.trigger.checkError({ error: errorMessage });
    }
  };

  const handleCancelDownload = async () => {
    if (update) {
      try {
        await update.close();
      } catch (err) {
        console.error("Failed to close update:", err);
      }
    }
    updateStore.trigger.cancelDownload();
  };

  const handleInstall = async () => {
    if (!update) {
      return;
    }

    updateStore.trigger.setInstalling();

    try {
      if (process.env.NODE_ENV !== "development") {
        await update.install();
        await relaunch();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Installation failed";
      updateStore.trigger.checkError({ error: errorMessage });
    }
  };

  const handleRetry = () => {
    handleCheckForUpdate();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (updateStore.getSnapshot().context.state === "idle") {
        handleCheckForUpdate();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (state === "checking") {
    return (
      <div
        className={clsx(
          "flex w-full items-center gap-2.5",
          "px-4 py-1.5",
          "text-sm text-slate-700",
        )}
      >
        <Loader2 className={clsx("h-4 w-4 flex-shrink-0 animate-spin", "text-slate-400")} />
        <span className={clsx("flex-1", "text-left font-medium")}>Checking for updates...</span>
      </div>
    );
  }

  if (state === "noUpdate") {
    return (
      <div
        className={clsx(
          "flex w-full items-center gap-2.5",
          "px-4 py-1.5",
          "text-sm text-slate-700",
        )}
      >
        <CheckCircle className={clsx("h-4 w-4 flex-shrink-0", "text-green-500")} />
        <span className={clsx("flex-1", "text-left font-medium")}>You're up to date</span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <MenuItem
        icon={AlertCircle}
        label={error || "Update check failed"}
        badge={
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRetry();
            }}
            className={clsx(
              "rounded-full",
              "px-2 py-0.5",
              "bg-red-50",
              "text-xs font-semibold text-red-600",
              "hover:bg-red-100",
            )}
          >
            Retry
          </button>
        }
        onClick={() => {}}
      />
    );
  }

  if (state === "available") {
    return (
      <MenuItem
        icon={Download}
        label={`Download v${update?.version || "new version"}`}
        badge={<div className="h-2 w-2 rounded-full bg-red-500" />}
        onClick={handleStartDownload}
      />
    );
  }

  if (state === "downloading") {
    return (
      <div className={clsx("flex w-full flex-col gap-2", "px-4 py-2", "text-sm text-slate-700")}>
        <div className="flex items-center gap-2.5">
          <Loader2 className={clsx("h-4 w-4 flex-shrink-0 animate-spin", "text-blue-500")} />
          <span className={clsx("flex-1", "text-left font-medium")}>
            Downloading... {downloadProgress.percentage}%
          </span>
          <button
            onClick={handleCancelDownload}
            className={clsx(
              "flex h-6 w-6 items-center justify-center",
              "rounded-full",
              "hover:bg-slate-100",
              "transition-colors",
            )}
            title="Cancel download"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${downloadProgress.percentage}%` }}
          />
        </div>
      </div>
    );
  }

  if (state === "ready") {
    return (
      <MenuItem
        icon={CheckCircle}
        label="Install update"
        badge={<div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
        onClick={handleInstall}
      />
    );
  }

  if (state === "installing") {
    return (
      <div
        className={clsx(
          "flex w-full items-center gap-2.5",
          "px-4 py-1.5",
          "text-sm text-slate-700",
        )}
      >
        <Loader2 className={clsx("h-4 w-4 flex-shrink-0 animate-spin", "text-green-500")} />
        <span className={clsx("flex-1", "text-left font-medium")}>Installing...</span>
      </div>
    );
  }

  return (
    <MenuItem
      icon={RefreshCw}
      label="Check for updates"
      onClick={handleCheckForUpdate}
    />
  );
}
