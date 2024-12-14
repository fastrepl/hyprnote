import * as Switch from "@radix-ui/react-switch";

interface NotificationSettingsProps {
  scheduledMeetings: boolean;
  setScheduledMeetings: (value: boolean) => void;
  autoDetectedMeetings: boolean;
  setAutoDetectedMeetings: (value: boolean) => void;
}

export function NotificationSettings({
  scheduledMeetings,
  setScheduledMeetings,
  autoDetectedMeetings,
  setAutoDetectedMeetings,
}: NotificationSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          예약된 미팅
        </label>
        <Switch.Root
          checked={scheduledMeetings}
          onCheckedChange={setScheduledMeetings}
          className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
        >
          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
        </Switch.Root>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          자동 감지된 미팅
        </label>
        <Switch.Root
          checked={autoDetectedMeetings}
          onCheckedChange={setAutoDetectedMeetings}
          className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
        >
          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
        </Switch.Root>
      </div>
    </div>
  );
}
