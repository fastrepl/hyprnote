// https://github.com/fastrepl/hyprnote/blob/0f5a1d5/apps/desktop/src/components/right-panel/hooks/useTranscript.ts
import { useMutation, useQuery } from "@tanstack/react-query";
import { message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { AlertTriangle, Check } from "lucide-react";
import { useState } from "react";

import { commands as listenerCommands } from "@hypr/plugin-listener";
import { Button } from "@hypr/ui/components/ui/button";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/utils";

export function Permissions() {
  const [micPermissionRequested, setMicPermissionRequested] = useState(false);

  const micPermissionStatus = useQuery({
    queryKey: ["micPermission"],
    queryFn: () => listenerCommands.checkMicrophoneAccess(),
    refetchInterval: 1000,
  });

  const systemAudioPermissionStatus = useQuery({
    queryKey: ["systemAudioPermission"],
    queryFn: () => listenerCommands.checkSystemAudioAccess(),
    refetchInterval: 1000,
  });

  const micPermission = useMutation({
    mutationFn: () => listenerCommands.requestMicrophoneAccess(),
    onSuccess: () => {
      setMicPermissionRequested(true);
      setTimeout(() => {
        micPermissionStatus.refetch();
      }, 3000);
    },
    onError: (error) => {
      setMicPermissionRequested(true);
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
    if (micPermissionRequested && !micPermissionStatus.data) {
      listenerCommands.openMicrophoneAccessSettings();
    } else {
      micPermission.mutate();
    }
  };

  const hasMicAccess = micPermissionStatus.data?.status === "ok" ? micPermissionStatus.data.data : false;
  const hasSystemAudioAccess = systemAudioPermissionStatus.data?.status === "ok"
    ? systemAudioPermissionStatus.data.data
    : false;

  return (
    <div>
      <h2 className="font-semibold mb-4">Permissions</h2>
      <div className="space-y-4">
        <PermissionRow
          title="Microphone access"
          hasAccess={hasMicAccess}
          grantedMessage="Thanks for granting permission for microphone"
          deniedMessage="Oops! You need to grant access to use Hyprnote"
          isPending={micPermission.isPending}
          buttonText={micPermissionRequested && !hasMicAccess ? "Open Settings" : "Grant Permission"}
          onGrant={handleMicPermissionAction}
        />
        <PermissionRow
          title="System audio access"
          hasAccess={hasSystemAudioAccess}
          grantedMessage="Thanks for granting permission for system audio"
          deniedMessage="Oops! You need to grant access to use Hyprnote"
          isPending={capturePermission.isPending}
          buttonText="Grant Permission"
          onGrant={() => capturePermission.mutate(undefined)}
        />
      </div>
    </div>
  );
}
function PermissionRow({
  title,
  hasAccess,
  grantedMessage,
  deniedMessage,
  isPending,
  buttonText,
  onGrant,
}: {
  title: string;
  hasAccess: boolean | undefined;
  grantedMessage: string;
  deniedMessage: string;
  isPending: boolean;
  buttonText: string;
  onGrant: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <h3 className={cn("text-sm font-medium mb-1", !hasAccess && "text-red-500")}>
          {title}
        </h3>
        <p className={cn(["text-xs", hasAccess ? "text-neutral-600" : "text-red-500"])}>
          {hasAccess ? grantedMessage : deniedMessage}
        </p>
      </div>
      <Button
        variant={hasAccess ? "outline" : "default"}
        className="w-40 text-xs shadow-none"
        disabled={hasAccess || isPending}
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
              {hasAccess ? <Check size={16} /> : <AlertTriangle size={16} />}
              {hasAccess ? "Access Granted" : buttonText}
            </>
          )}
      </Button>
    </div>
  );
}
