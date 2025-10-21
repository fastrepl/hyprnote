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
      <MenuItem
        icon={Spinner}
        label="Checking for updates..."
        onClick={() => {}}
      />
    );
  }

  if (state === "noUpdate") {
    return (
      <MenuItem
        icon={CheckCircle}
        label="You're up to date"
        onClick={() => {}}
      />
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
          <Spinner size={16} className="flex-shrink-0 text-neutral-500" />
          <span>
            Downloading...
          </span>
          <button
            onClick={handleCancelDownload}
            className={cn([
              "flex h-6 w-6 flex-shrink-0 items-center justify-center",
              "rounded-full",
              "hover:bg-neutral-100",
              "transition-colors",
            ])}
            title="Cancel download"
          >
            <X className="h-4 w-4 text-neutral-500" />
          </button>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full bg-neutral-900 transition-all duration-300"
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
        badge={<div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
        onClick={handleInstall}
      />
    );
  }

  if (state === "installing") {
    return (
      <MenuItem
        icon={Spinner}
        label="Installing..."
        onClick={() => {}}
      />
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
