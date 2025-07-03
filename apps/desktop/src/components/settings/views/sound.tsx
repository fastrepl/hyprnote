import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MicIcon, Volume2Icon } from "lucide-react";

import { commands as listenerCommands } from "@hypr/plugin-listener";
import { Button } from "@hypr/ui/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/ui/lib/utils";
import { MicrophoneDeviceInfo } from "../../../utils/microphone-devices";

interface PermissionItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  done: boolean | undefined;
  isPending: boolean;
  onRequest: () => void;
}

function PermissionItem({
  icon,
  title,
  description,
  done,
  isPending,
  onRequest,
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
            {done ? <Trans>Access Granted</Trans> : description}
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
                  <Trans>Requesting...</Trans>
                </>
              )
              : <Trans>Enable</Trans>}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Sound() {
  const { t } = useLingui();

  const micPermissionStatus = useQuery({
    queryKey: ["micPermission"],
    queryFn: () => listenerCommands.checkMicrophoneAccess(),
  });

  const systemAudioPermissionStatus = useQuery({
    queryKey: ["systemAudioPermission"],
    queryFn: () => listenerCommands.checkSystemAudioAccess(),
  });

  const deviceQuery = useQuery<MicrophoneDeviceInfo>({
    queryKey: ["microphoneDeviceInfo"],
    queryFn: async () => {
      try {
        const result = await listenerCommands.getSelectedMicrophoneDevice();
        return result;
      } catch (error) {
        throw error;
      }
    },
    enabled: micPermissionStatus.data === true,
  });

  const micPermission = useMutation({
    mutationFn: () => listenerCommands.requestMicrophoneAccess(),
    onSuccess: () => {
      micPermissionStatus.refetch();
      deviceQuery.refetch();
    },
  });

  const capturePermission = useMutation({
    mutationFn: () => listenerCommands.requestSystemAudioAccess(),
    onSuccess: () => systemAudioPermissionStatus.refetch(),
  });

  const updateSelectedDevice = useMutation({
    mutationFn: (deviceName: string | null) => listenerCommands.setSelectedMicrophoneDevice(deviceName),
    onSuccess: () => deviceQuery.refetch(),
  });

  const handleMicrophoneDeviceChange = (deviceName: string) => {
    const deviceToSet = deviceName === "default" ? null : deviceName;
    updateSelectedDevice.mutate(deviceToSet);
  };

  const getSelectedDevice = () => {
    const currentDevice = deviceQuery.data?.selected;
    if (!currentDevice) {
      return "default";
    }

    // Check if the selected device is still available
    if (deviceQuery.data?.devices && !deviceQuery.data.devices.includes(currentDevice)) {
      return "default";
    }

    return currentDevice;
  };

  return (
    <div>
      <div className="space-y-4">
        <div className="space-y-2">
          <PermissionItem
            icon={<MicIcon className="h-4 w-4" />}
            title={t`Microphone Access`}
            description={t`Required to transcribe your voice during meetings`}
            done={micPermissionStatus.data}
            isPending={micPermission.isPending}
            onRequest={() => micPermission.mutate()}
          />

          <PermissionItem
            icon={<Volume2Icon className="h-4 w-4" />}
            title={t`System Audio Access`}
            description={t`Required to transcribe other people's voice during meetings`}
            done={systemAudioPermissionStatus.data}
            isPending={capturePermission.isPending}
            onRequest={() => capturePermission.mutate()}
          />
        </div>

        {micPermissionStatus.data && (
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex size-6 items-center justify-center">
                <MicIcon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium">
                  <Trans>Microphone Device</Trans>
                </div>
                <div className="text-xs text-muted-foreground">
                  <Trans>Select which microphone to use for recording</Trans>
                </div>
              </div>
            </div>

            <div className="ml-9">
              <Select
                value={getSelectedDevice()}
                onValueChange={handleMicrophoneDeviceChange}
                disabled={deviceQuery.isLoading || updateSelectedDevice.isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t`Select microphone device`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    <Trans>System Default</Trans>
                  </SelectItem>
                  {deviceQuery.data?.devices?.map((device) => (
                    <SelectItem key={device} value={device}>
                      {device}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {deviceQuery.isLoading && (
                <div className="text-xs text-muted-foreground mt-2">
                  <Trans>Loading available devices...</Trans>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
