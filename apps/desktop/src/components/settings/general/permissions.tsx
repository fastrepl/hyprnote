// https://github.com/fastrepl/hyprnote/blob/0f5a1d5/apps/desktop/src/components/right-panel/hooks/useTranscript.ts
import { useMutation, useQuery } from "@tanstack/react-query";
import { message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { AlertTriangle, Check } from "lucide-react";

import { commands as listenerCommands, type PermissionStatus } from "@hypr/plugin-listener";
import { Button } from "@hypr/ui/components/ui/button";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/utils";

export function Permissions() {
  const micPermissionStatus = useQuery({
    queryKey: ["micPermission"],
    queryFn: () => listenerCommands.checkMicrophoneAccess(),
    refetchInterval: 1000,
    select: (result) => {
      if (result.status === "error") {
        throw new Error(result.error);
      }

      return result.data;
    },
  });

  const systemAudioPermissionStatus = useQuery({
    queryKey: ["systemAudioPermission"],
    queryFn: () => listenerCommands.checkSystemAudioAccess(),
    refetchInterval: 1000,
    select: (result) => {
      if (result.status === "error") {
        throw new Error(result.error);
      }

      return result.data;
    },
  });

  const micPermission = useMutation({
    mutationFn: () => listenerCommands.requestMicrophoneAccess(),
    onSuccess: () => {
      setTimeout(() => {
        micPermissionStatus.refetch();
      }, 3000);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const capturePermission = useMutation({
    mutationFn: () => listenerCommands.requestSystemAudioAccess(),
    onSuccess: () => {
      message("The app will now restart to apply the changes", { kind: "info", title: "System Audio Status Changed" });
      setTimeout(() => {
        relaunch();
      }, 2000);
    },
    onError: console.error,
  });

  const handleMicPermissionAction = () => {
    if (micPermissionStatus.data === "Denied") {
      listenerCommands.openMicrophoneAccessSettings();
    } else {
      micPermission.mutate();
    }
  };

  const handleSystemAudioPermissionAction = () => {
    if (systemAudioPermissionStatus.data === "Denied") {
      listenerCommands.openSystemAudioAccessSettings();
    } else {
      capturePermission.mutate(undefined);
    }
  };

  return (
    <div>
      <h2 className="font-semibold mb-4">Permissions</h2>
      <div className="space-y-4">
        <PermissionRow
          title="Microphone access"
          status={micPermissionStatus.data}
          isPending={micPermission.isPending}
          onGrant={handleMicPermissionAction}
        />
        <PermissionRow
          title="System audio access"
          status={systemAudioPermissionStatus.data}
          isPending={capturePermission.isPending}
          onGrant={handleSystemAudioPermissionAction}
        />
      </div>
    </div>
  );
}
function PermissionRow({
  title,
  status,
  isPending,
  onGrant,
}: {
  title: string;
  status: PermissionStatus | undefined;
  isPending: boolean;
  onGrant: () => void;
}) {
  const isAuthorized = status === "Authorized";
  const isDenied = status === "Denied";

  let message = "";
  let buttonText = "";

  if (isAuthorized) {
    message = "Thanks for granting permission";
    buttonText = "Access Granted";
  } else if (isDenied) {
    message = "You should toggle in the Settings manually";
    buttonText = "Open Settings";
  } else {
    message = "You need to grant access to use Hyprnote";
    buttonText = "Grant Permission";
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <h3 className={cn("text-sm font-medium mb-1", isDenied && "text-red-500")}>
          {title}
        </h3>
        <p className={cn(["text-xs", isAuthorized ? "text-neutral-600" : "text-red-500"])}>
          {message}
        </p>
      </div>
      <Button
        variant={isAuthorized ? "outline" : "default"}
        className="w-40 text-xs shadow-none"
        disabled={isAuthorized || isPending}
        onClick={onGrant}
      >
        {isPending
          ? (
            <>
              <Spinner className="mr-1" />
              Requesting...
            </>
          )
          : (
            <>
              {isAuthorized ? <Check size={16} /> : <AlertTriangle size={16} />}
              {buttonText}
            </>
          )}
      </Button>
    </div>
  );
}
