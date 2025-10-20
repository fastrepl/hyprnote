import { clsx } from "clsx";
import { AlertCircle, CheckCircle, Download, RefreshCw, X } from "lucide-react";

import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/utils";
import { MenuItem } from "../shared";
import { useOTA } from "./task";

export function UpdateChecker() {
  const {
    state,
    update,
    error,
    downloadProgress,
    handleCheckForUpdate,
    handleStartDownload,
    handleCancelDownload,
    handleInstall,
  } = useOTA();

  if (state === "checking") {
    return (
      <MenuItemLikeContainer>
        <Spinner size={16} className="flex-shrink-0 text-neutral-400" />
        <span className={cn("flex-1", "text-left font-medium")}>
          Checking for updates...
        </span>
      </MenuItemLikeContainer>
    );
  }

  if (state === "noUpdate") {
    return (
      <MenuItemLikeContainer>
        <CheckCircle className={cn("h-4 w-4 flex-shrink-0", "text-green-500")} />
        <span className={cn("flex-1", "text-left font-medium")}>
          You're up to date
        </span>
      </MenuItemLikeContainer>
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
              handleCheckForUpdate();
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
      <MenuItemLikeContainer>
        <div className="flex items-center gap-2.5">
          <Spinner size={16} className="flex-shrink-0 text-blue-500" />
          <span className={clsx("flex-1", "text-left font-medium")}>
            Downloading... {downloadProgress.percentage}%
          </span>
          <button
            onClick={handleCancelDownload}
            className={clsx(
              "flex h-6 w-6 items-center justify-center",
              "rounded-full",
              "hover:bg-neutral-100",
              "transition-colors",
            )}
            title="Cancel download"
          >
            <X className="h-4 w-4 text-neutral-500" />
          </button>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${downloadProgress.percentage}%` }}
          />
        </div>
      </MenuItemLikeContainer>
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
      <MenuItemLikeContainer>
        <Spinner size={16} className="flex-shrink-0 text-green-500" />
        <span className={clsx("flex-1", "text-left font-medium")}>
          Installing...
        </span>
      </MenuItemLikeContainer>
    );
  }

  if (state === "idle") {
    return (
      <MenuItem
        icon={RefreshCw}
        label="Check for updates"
        onClick={handleCheckForUpdate}
      />
    );
  }
}

function MenuItemLikeContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg",
        "px-4 py-1.5",
        "text-sm text-black",
        "transition-colors hover:bg-neutral-100",
      )}
    >
      {children}
    </div>
  );
}
