import * as Tabs from "@radix-ui/react-tabs";
import {
  RiSettings4Line,
  RiMessage2Line,
  RiBankCardLine,
  RiCalendarLine,
  RiNotification3Line,
  RiUser3Line,
  RiPlugLine,
} from "@remixicon/react";

interface TabItem {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function SettingsTabs() {
  const mainTabs: TabItem[] = [
    { value: "profile", label: "프로필", icon: RiUser3Line },
    { value: "general", label: "일반", icon: RiSettings4Line },
    { value: "feedback", label: "피드백", icon: RiMessage2Line },
    { value: "billing", label: "결제", icon: RiBankCardLine },
    { value: "calendar", label: "캘린더", icon: RiCalendarLine },
    { value: "notification", label: "알림", icon: RiNotification3Line },
    { value: "integrations", label: "연동", icon: RiPlugLine },
  ];

  const TabButton = ({ tab }: { tab: TabItem }) => (
    <Tabs.Trigger
      key={tab.value}
      value={tab.value}
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 focus:outline-none data-[state=active]:bg-white data-[state=active]:text-blue-600"
    >
      <tab.icon className="size-5" />
      {tab.label}
    </Tabs.Trigger>
  );

  return (
    <div className="flex h-full flex-col justify-between">
      <Tabs.List className="space-y-1">
        {mainTabs.map((tab) => (
          <TabButton key={tab.value} tab={tab} />
        ))}
      </Tabs.List>
    </div>
  );
}
