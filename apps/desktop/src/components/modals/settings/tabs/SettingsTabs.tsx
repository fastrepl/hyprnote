import * as Tabs from "@radix-ui/react-tabs";

export function SettingsTabs() {
  return (
    <Tabs.List className="flex w-48 flex-none flex-col border-r border-gray-200">
      <TabTrigger value="general">일반</TabTrigger>
      <TabTrigger value="calendar">캘린더</TabTrigger>
      <TabTrigger value="notifications">알림</TabTrigger>
      <TabTrigger value="slack">Slack</TabTrigger>
      <TabTrigger value="license">라이센스</TabTrigger>
      <TabTrigger value="feedback">피드백</TabTrigger>
    </Tabs.List>
  );
}

interface TabTriggerProps {
  value: string;
  children: React.ReactNode;
}

function TabTrigger({ value, children }: TabTriggerProps) {
  return (
    <Tabs.Trigger
      value={value}
      className="px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 data-[state=active]:border-r-2 data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-500"
    >
      {children}
    </Tabs.Trigger>
  );
}
