import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { commands as audioPriorityCommands } from "@hypr/plugin-audio-priority";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hypr/ui/components/ui/select";

export function Audio() {
  const queryClient = useQueryClient();

  const { data: inputDevices } = useQuery({
    queryKey: ["audio-input-devices"],
    queryFn: async () => {
      const result = await audioPriorityCommands.listInputDevices();
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
    refetchInterval: 3000,
  });

  const { data: defaultInputDevice } = useQuery({
    queryKey: ["audio-default-input-device"],
    queryFn: async () => {
      const result = await audioPriorityCommands.getDefaultInputDevice();
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
    refetchInterval: 3000,
  });

  const mutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const result =
        await audioPriorityCommands.setDefaultInputDevice(deviceId);
      if (result.status === "error") {
        throw new Error(result.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["audio-default-input-device"],
      });
      queryClient.invalidateQueries({ queryKey: ["audio-input-devices"] });
    },
  });

  return (
    <div>
      <h2 className="font-semibold mb-4">Audio</h2>
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-medium mb-1">Input device</h3>
          <p className="text-xs text-neutral-600">
            Microphone used for recording your voice
          </p>
        </div>
        <Select
          value={defaultInputDevice?.id ?? ""}
          onValueChange={(deviceId) => mutation.mutate(deviceId)}
        >
          <SelectTrigger className="w-48 shadow-none focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="Select device" />
          </SelectTrigger>
          <SelectContent className="max-h-[250px] overflow-auto">
            {inputDevices?.map((device) => (
              <SelectItem key={device.id} value={device.id}>
                {device.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
