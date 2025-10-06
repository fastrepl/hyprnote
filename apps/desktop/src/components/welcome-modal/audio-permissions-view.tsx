import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2Icon, MicIcon, Volume2Icon } from "lucide-react";

import { commands as listenerCommands } from "@hypr/plugin-listener";
import { Button } from "@hypr/ui/components/ui/button";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/ui/lib/utils";
import { message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { useState } from "react";

interface PermissionItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  done: boolean | undefined;
  isPending: boolean;
  onRequest: () => void;
  showSystemSettings?: boolean;
  buttonText: string;
}

function PermissionItem({
  icon,
  title,
  description,
  done,
  isPending,
  onRequest,
  showSystemSettings = false,
  buttonText,
}: PermissionItemProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-4 transition-all duration-200",
        done ? "border-blue-500 bg-blue-50" : "bg-white border-neutral-200",
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-full flex-shrink-0",
            done ? "bg-blue-100" : "bg-neutral-50",
          )}
        >
          <div className={cn(done ? "text-blue-600" : "text-neutral-500")}>{icon}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{title}</div>
          <div className="text-sm text-muted-foreground">
            {done
              ? (
                <span className="text-blue-600 flex items-center gap-1">
                  <CheckCircle2Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  Access Granted
                </span>
              )
              : <span className="block truncate pr-2">{description}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!done && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onRequest}
              disabled={isPending}
              className="min-w-20"
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
          </>
        )}
        {done && (
          <div className="flex size-8 items-center justify-center rounded-full bg-blue-100">
            <CheckCircle2Icon className="w-4 h-4 text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
}

interface AudioPermissionsViewProps {
  onContinue: () => void;
}

export function AudioPermissionsView({ onContinue }: AudioPermissionsViewProps) {
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

  const allPermissionsGranted = micPermissionStatus.data && systemAudioPermissionStatus.data;

  return (
    <div className="flex flex-col items-center min-w-[30rem]">
      <h2 className="text-xl font-semibold mb-4">
        Audio Permissions
      </h2>

      <p className="text-center text-sm text-muted-foreground mb-8">
        After you grant system audio access, app will restart to apply the changes
      </p>

      <div className="w-full max-w-[30rem] space-y-3 mb-8">
        <PermissionItem
          icon={<MicIcon className="h-5 w-5" />}
          title={"Microphone Access"}
          description={"Required for meeting transcription"}
          done={micPermissionStatus.data}
          isPending={micPermission.isPending}
          onRequest={handleMicPermissionAction}
          buttonText={micPermissionRequested && !micPermissionStatus.data ? "Open Settings" : "Enable"}
        />

        <PermissionItem
          icon={<Volume2Icon className="h-5 w-5" />}
          title={"System Audio Access"}
          description={"Required for meeting transcription"}
          done={systemAudioPermissionStatus.data}
          isPending={capturePermission.isPending}
          onRequest={() => capturePermission.mutate({})}
          buttonText="Enable"
        />
      </div>

      <PushableButton
        onClick={onContinue}
        disabled={!allPermissionsGranted}
        className="w-full max-w-sm"
      >
        Continue
      </PushableButton>

      {!allPermissionsGranted && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          Grant both permissions to continue
        </p>
      )}
    </div>
  );
}
