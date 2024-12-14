import * as Switch from "@radix-ui/react-switch";

interface CalendarSettingsProps {
  googleCalendar: boolean;
  setGoogleCalendar: (value: boolean) => void;
  iCalCalendar: boolean;
  setICalCalendar: (value: boolean) => void;
}

export function CalendarSettings({
  googleCalendar,
  setGoogleCalendar,
  iCalCalendar,
  setICalCalendar,
}: CalendarSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Google 캘린더
        </label>
        <Switch.Root
          checked={googleCalendar}
          onCheckedChange={setGoogleCalendar}
          className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
        >
          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
        </Switch.Root>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          iCal 캘린더
        </label>
        <Switch.Root
          checked={iCalCalendar}
          onCheckedChange={setICalCalendar}
          className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
        >
          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
        </Switch.Root>
      </div>
    </div>
  );
}
