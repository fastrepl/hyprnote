import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2Icon, MicIcon, Volume2Icon } from "lucide-react";
import { useState } from "react";

import { commands as listenerCommands } from "@hypr/plugin-listener";
import { Button } from "@hypr/ui/components/ui/button";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/ui/lib/utils";

interface PermissionItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  done: boolean | undefined;
  isPending: boolean;
  onRequest: () => void;
  showSystemSettings?: boolean;
}

function PermissionItem({
  icon,
  title,
  description,
  done,
  isPending,
  onRequest,
  showSystemSettings = false,
}: PermissionItemProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-4 transition-all duration-200",
        done ? "border-blue-500 bg-blue-50" : "bg-white border-neutral-200",
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn(
          "flex size-10 items-center justify-center rounded-full flex-shrink-0",
          done ? "bg-blue-100" : "bg-neutral-50"
        )}>
          <div className={cn(done ? "text-blue-600" : "text-neutral-500")}>{icon}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{title}</div>
          <div className="text-sm text-muted-foreground">
            {done ? (
              <span className="text-blue-600 flex items-center gap-1">
                <CheckCircle2Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <Trans>Access Granted</Trans>
              </span>
            ) : (
              <span className="block truncate pr-2">{description}</span>
            )}
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
                    <Trans>Requesting...</Trans>
                  </>
                )
                : <Trans>Enable</Trans>}
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
  const { t } = useLingui();
  const [showSystemSettingsHelp, setShowSystemSettingsHelp] = useState(false);

  const micPermissionStatus = useQuery({
    queryKey: ["micPermission"],
    queryFn: () => listenerCommands.checkMicrophoneAccess(),
    refetchInterval: 500,
  });

  const systemAudioPermissionStatus = useQuery({
    queryKey: ["systemAudioPermission"],
    queryFn: () => listenerCommands.checkSystemAudioAccess(),
    refetchInterval: 500,
  });

  const micPermission = useMutation({
    mutationFn: async () => {
      try {
        const result = await listenerCommands.requestMicrophoneAccess();
        return result;
      } catch (error) {
        console.error("Microphone permission request failed:", error);
        // In development, the permission dialog might not appear
        // Show system settings button immediately
        setShowSystemSettingsHelp(true);
        throw error;
      }
    },
    onSuccess: () => {
      micPermissionStatus.refetch();
      setShowSystemSettingsHelp(false);
    },
    onError: (error) => {
      console.error("Microphone permission error:", error);
      setShowSystemSettingsHelp(true);
    },
  });

  const capturePermission = useMutation({
    mutationFn: async () => {
      try {
        const result = await listenerCommands.requestSystemAudioAccess();
        return result;
      } catch (error) {
        console.error("System audio permission request failed:", error);
        setShowSystemSettingsHelp(true);
        throw error;
      }
    },
    onSuccess: () => {
      systemAudioPermissionStatus.refetch();
      setShowSystemSettingsHelp(false);
    },
    onError: (error) => {
      console.error("System audio permission error:", error);
      setShowSystemSettingsHelp(true);
    },
  });

  const allPermissionsGranted = micPermissionStatus.data && systemAudioPermissionStatus.data;

  return (
    <div className="flex flex-col items-center min-w-[30rem]">
      <h2 className="text-xl font-semibold mb-4">
        <Trans>Audio Permissions</Trans>
      </h2>
      
      <p className="text-center text-sm text-muted-foreground mb-8">
        <Trans>Grant access to audio so Hyprnote can transcribe your meetings </Trans>
      </p>

      <div className="w-full max-w-[30rem] space-y-3 mb-8">
        <PermissionItem
          icon={<MicIcon className="h-5 w-5" />}
          title={t`Microphone Access`}
          description={t`Required to transcribe your voice during meetings`}
          done={micPermissionStatus.data}
          isPending={micPermission.isPending}
          onRequest={() => micPermission.mutate({})}
        />

        <PermissionItem
          icon={<Volume2Icon className="h-5 w-5" />}
          title={t`System Audio Access`}
          description={t`Required to transcribe other people's voice during meetings`}
          done={systemAudioPermissionStatus.data}
          isPending={capturePermission.isPending}
          onRequest={() => capturePermission.mutate({})}
        />
      </div>

      <PushableButton
        onClick={onContinue}
        disabled={!allPermissionsGranted}
        className="w-full max-w-sm"
      >
        <Trans>Continue</Trans>
      </PushableButton>

      {!allPermissionsGranted && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          <Trans>Grant both permissions to continue</Trans>
        </p>
      )}
    </div>
  );
}