import { useState } from "react";
import * as Switch from "@radix-ui/react-switch";

export function Notifications() {
  const [scheduledMeetings, setScheduledMeetings] = useState(true);
  const [autoIdentify, setAutoIdentify] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900">알림</h3>
        <p className="mt-1 text-sm text-gray-500">알림 설정을 관리하세요</p>
      </div>

      <div className="h-px bg-gray-200" />

      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            예정된 미팅 알림
          </label>
          <p className="text-sm text-gray-500">
            캘린더에 등록된 미팅 시작 전에 알림을 받습니다
          </p>
        </div>
        <Switch.Root
          checked={scheduledMeetings}
          onCheckedChange={setScheduledMeetings}
          className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
        >
          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
        </Switch.Root>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            자동 감지된 미팅 알림
          </label>
          <p className="text-sm text-gray-500">
            시스템이 자동으로 감지한 미팅에 대한 알림을 받습니다
          </p>
        </div>
        <Switch.Root
          checked={autoIdentify}
          onCheckedChange={setAutoIdentify}
          className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
        >
          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
        </Switch.Root>
      </div>
    </div>
  );
}
