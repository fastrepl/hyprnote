import * as Switch from "@radix-ui/react-switch";
import * as Select from "@radix-ui/react-select";

interface GeneralSettingsProps {
  fullName: string;
  setFullName: (value: string) => void;
  showMeetingIndicator: boolean;
  setShowMeetingIndicator: (value: boolean) => void;
  openOnLogin: boolean;
  setOpenOnLogin: (value: boolean) => void;
  theme: string;
  setTheme: (value: string) => void;
  jargons: string;
  setJargons: (value: string) => void;
}

export function GeneralSettings({
  fullName,
  setFullName,
  showMeetingIndicator,
  setShowMeetingIndicator,
  openOnLogin,
  setOpenOnLogin,
  theme,
  setTheme,
  jargons,
  setJargons,
}: GeneralSettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">이름</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          실시간 미팅 표시
        </label>
        <Switch.Root
          checked={showMeetingIndicator}
          onCheckedChange={setShowMeetingIndicator}
          className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
        >
          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
        </Switch.Root>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          로그인시 자동 실행
        </label>
        <Switch.Root
          checked={openOnLogin}
          onCheckedChange={setOpenOnLogin}
          className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
        >
          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
        </Switch.Root>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">테마</label>
        <Select.Root value={theme} onValueChange={setTheme}>
          <Select.Trigger className="mt-1 inline-flex w-full justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <Select.Value />
            <Select.Icon>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="overflow-hidden rounded-md bg-white shadow-lg">
              <Select.Viewport className="p-1">
                <Select.Item
                  value="system"
                  className="relative flex h-8 select-none items-center rounded px-6 py-2 text-sm text-gray-900 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-500 data-[highlighted]:outline-none"
                >
                  <Select.ItemText>시스템</Select.ItemText>
                </Select.Item>
                <Select.Item
                  value="light"
                  className="relative flex h-8 select-none items-center rounded px-6 py-2 text-sm text-gray-900 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-500 data-[highlighted]:outline-none"
                >
                  <Select.ItemText>라이트</Select.ItemText>
                </Select.Item>
                <Select.Item
                  value="dark"
                  className="relative flex h-8 select-none items-center rounded px-6 py-2 text-sm text-gray-900 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-500 data-[highlighted]:outline-none"
                >
                  <Select.ItemText>다크</Select.ItemText>
                </Select.Item>
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          자주 쓰는 용어
        </label>
        <textarea
          value={jargons}
          onChange={(e) => setJargons(e.target.value)}
          rows={4}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="자주 쓰는 용어를 입력하세요"
        />
      </div>
    </div>
  );
}
