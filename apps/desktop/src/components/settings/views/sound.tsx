import { useLingui } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MicIcon, Volume2Icon } from "lucide-react";
import { useState } from "react";

import { commands as listenerCommands } from "@hypr/plugin-listener";
import { Button } from "@hypr/ui/components/ui/button";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/ui/lib/utils";
import { message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";

interface PermissionItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  done: boolean | undefined;
  isPending: boolean;
  onRequest: () => void;
  buttonText: string;
}

function PermissionItem({
  icon,
  title,
  description,
  done,
  isPending,
  onRequest,
  buttonText,
}: PermissionItemProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-4",
        !done && "bg-muted",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-6 items-center justify-center">{icon}</div>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">
            {done ? <p>Access Granted</p> : <p>{description}</p>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!done && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRequest}
            disabled={isPending}
            className="min-w-20 text-center"
          >
            {isPending
              ? (
                <>
                  <Spinner className="mr-2" />
                  Requesting...
                </>
              )
              : <p>{buttonText}</p>}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Sound() {
  const { t } = useLingui();

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

  return (
    <div>
      <div className="space-y-2">
        <PermissionItem
          icon={<MicIcon className="h-4 w-4" />}
          title={t`Microphone Access`}
          description={t`Required to transcribe your voice during meetings`}
          done={micPermissionStatus.data}
          isPending={micPermission.isPending}
          onRequest={handleMicPermissionAction}
          buttonText={micPermissionRequested && !micPermissionStatus.data ? "Open Settings" : "Enable"}
        />

        <PermissionItem
          icon={<Volume2Icon className="h-4 w-4" />}
          title={t`System Audio Access`}
          description={t`Required to transcribe other people's voice during meetings`}
          done={systemAudioPermissionStatus.data}
          isPending={capturePermission.isPending}
          onRequest={() => capturePermission.mutate({})}
          buttonText="Enable"
        />
      </div>
    </div>
  );
}
