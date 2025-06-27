import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MicIcon, Volume2Icon } from "lucide-react";

import { commands } from "../../../types/tauri.gen";
import { Button } from "@hypr/ui/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/ui/lib/utils";

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
    queryFn: () => commands.checkMicrophoneAccess(),
  });

  const systemAudioPermissionStatus = useQuery({
    queryKey: ["systemAudioPermission"],
    queryFn: () => commands.checkSystemAudioAccess(),
  });

  const deviceQuery = useQuery({
    queryKey: ["microphoneDeviceInfo"],
    queryFn: async () => {
      console.log("Attempting to call getSelectedMicrophoneDevice...");
      try {
        const result = await commands.getSelectedMicrophoneDevice();
        console.log("Device query result:", result);
        return result;
      } catch (error) {
        console.error("Device query failed:", error);
        throw error;
      }
    },
    enabled: micPermissionStatus.data === true,
  });

  const microphoneDevices = useQuery({
    queryKey: ["microphoneDevices"],
    queryFn: async () => {
      const result = deviceQuery.data;
      console.log("Processing device query result:", result);
      if (result && result.startsWith("DEVICES:")) {
        const devicesJson = result.substring(8);
        console.log("Devices JSON:", devicesJson);
        const devices = JSON.parse(devicesJson) as string[];
        console.log("Parsed devices:", devices);
        return devices;
      }
      return [];
    },
    enabled: micPermissionStatus.data === true && deviceQuery.data !== undefined,
  });

  const selectedDevice = useQuery({
    queryKey: ["selectedMicrophoneDevice"],
    queryFn: async () => {
      const result = deviceQuery.data;
      if (result && result.startsWith("DEVICES:")) {
        return null;
      }
      return result;
    },
    enabled: micPermissionStatus.data === true && deviceQuery.data !== undefined,
  });

  const micPermission = useMutation({
    mutationFn: () => commands.requestMicrophoneAccess(),
    onSuccess: () => {
      micPermissionStatus.refetch();
      deviceQuery.refetch();
    },
  });

  const capturePermission = useMutation({
    mutationFn: () => commands.requestSystemAudioAccess(),
    onSuccess: () => systemAudioPermissionStatus.refetch(),
  });

  const updateSelectedDevice = useMutation({
    mutationFn: (deviceName: string | null) => commands.setSelectedMicrophoneDevice(deviceName),
    onSuccess: () => deviceQuery.refetch(),
  });

  const handleMicrophoneDeviceChange = (deviceName: string) => {
    const deviceToSet = deviceName === "default" ? null : deviceName;
    updateSelectedDevice.mutate(deviceToSet);
  };

  const getSelectedDevice = () => {
    const currentDevice = selectedDevice.data;
    if (!currentDevice) {
      return "default";
    }

    // Check if the selected device is still available
    if (microphoneDevices.data && !microphoneDevices.data.includes(currentDevice)) {
      return "default";
    }

    return currentDevice;
  };

  const testCommand = async () => {
    console.log("=== MANUAL TEST: Calling getSelectedMicrophoneDevice ===");
    try {
      const result = await commands.getSelectedMicrophoneDevice();
      console.log("=== MANUAL TEST RESULT ===", result);
    } catch (error) {
      console.error("=== MANUAL TEST ERROR ===", error);
    }
  };

  return (
    <div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Button onClick={testCommand} variant="outline" size="sm">
            TEST COMMAND
          </Button>
          
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
                disabled={microphoneDevices.isLoading || updateSelectedDevice.isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t`Select microphone device`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    <Trans>System Default</Trans>
                  </SelectItem>
                  {microphoneDevices.data?.map((device) => (
                    <SelectItem key={device} value={device}>
                      {device}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {microphoneDevices.isLoading && (
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
