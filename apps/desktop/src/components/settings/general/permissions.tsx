import { AlertCircleIcon, ArrowRightIcon, CheckIcon } from "lucide-react";

import type { PermissionStatus } from "@hypr/plugin-permissions";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { usePermissions } from "../../../hooks/use-permissions";

function PermissionRow({
  title,
  description,
  status,
  isPending,
  onAction,
}: {
  title: string;
  description: string;
  status: PermissionStatus | undefined;
  isPending: boolean;
  onAction: () => void;
}) {
  const isAuthorized = status === "authorized";
  const isDenied = status === "denied";

  const displayMessage = isAuthorized
    ? "Permission granted"
    : isDenied
      ? "Please enable this permission in System Settings"
      : description;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <div
          className={cn([
            "flex items-center gap-2 mb-1",
            !isAuthorized && "text-red-500",
          ])}
        >
          {!isAuthorized && <AlertCircleIcon className="size-4" />}
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        <p className="text-xs text-neutral-600">{displayMessage}</p>
      </div>
      <Button
        variant={isAuthorized ? "outline" : "default"}
        size="icon"
        onClick={onAction}
        disabled={isPending || isAuthorized}
        className={cn([
          "size-8",
          isAuthorized && "bg-stone-100 text-stone-800",
        ])}
        aria-label={
          isAuthorized
            ? `${title} permission granted`
            : `Request ${title.toLowerCase()} permission`
        }
      >
        {isAuthorized ? (
          <CheckIcon className="size-5" />
        ) : (
          <ArrowRightIcon className="size-5" />
        )}
      </Button>
    </div>
  );
}

export function Permissions() {
  const {
    micPermissionStatus,
    systemAudioPermissionStatus,
    accessibilityPermissionStatus,
    micPermission,
    systemAudioPermission,
    accessibilityPermission,
    handleMicPermissionAction,
    handleSystemAudioPermissionAction,
    handleAccessibilityPermissionAction,
  } = usePermissions();

  return (
    <div>
      <h2 className="font-semibold mb-4">Permissions</h2>
      <div className="space-y-4">
        <PermissionRow
          title="Microphone"
          description="Required to record your voice during meetings and calls"
          status={micPermissionStatus.data}
          isPending={micPermission.isPending}
          onAction={handleMicPermissionAction}
        />
        <PermissionRow
          title="System audio"
          description="Required to capture other participants' voices in meetings"
          status={systemAudioPermissionStatus.data}
          isPending={systemAudioPermission.isPending}
          onAction={handleSystemAudioPermissionAction}
        />
        <PermissionRow
          title="Accessibility"
          description="Required to detect meeting apps and sync mute status"
          status={accessibilityPermissionStatus.data}
          isPending={accessibilityPermission.isPending}
          onAction={handleAccessibilityPermissionAction}
        />
      </div>
    </div>
  );
}
