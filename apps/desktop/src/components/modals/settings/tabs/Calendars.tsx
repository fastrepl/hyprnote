import { useState } from "react";
import * as Switch from "@radix-ui/react-switch";

export function Calendars() {
  const [googleCalendar, setGoogleCalendar] = useState(false);
  const [iCalCalendar, setICalCalendar] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Google 캘린더
          </label>
          <p className="text-sm text-gray-500">
            Google 캘린더와 연동하여 일정을 자동으로 가져옵니다
          </p>
        </div>
        <Switch.Root
          checked={googleCalendar}
          onCheckedChange={setGoogleCalendar}
          className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
        >
          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
        </Switch.Root>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            iCal 캘린더
          </label>
          <p className="text-sm text-gray-500">
            iCal 형식의 캘린더를 가져와서 일정을 동기화합니다
          </p>
        </div>
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
