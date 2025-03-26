import {
  BellIcon,
  BlocksIcon,
  CalendarIcon,
  // CreditCardIcon,
  FileTextIcon,
  FlaskConicalIcon,
  SettingsIcon,
  SparklesIcon,
  UserIcon,
  // UsersIcon,
} from "lucide-react";

import { type Tab } from "./types";

export function TabIcon({ tab }: { tab: Tab }) {
  switch (tab) {
    case "general":
      return <SettingsIcon className="h-4 w-4" />;
    case "profile":
      return <UserIcon className="h-4 w-4" />;
    case "ai":
      return <SparklesIcon className="h-4 w-4" />;
    case "calendar":
      return <CalendarIcon className="h-4 w-4" />;
    case "notifications":
      return <BellIcon className="h-4 w-4" />;
    case "templates":
      return <FileTextIcon className="h-4 w-4" />;
    case "extensions":
      return <BlocksIcon className="h-4 w-4" />;
      // case "team":
      //   return <UsersIcon className="h-4 w-4" />;
      // case "billing":
      //   return <CreditCardIcon className="h-4 w-4" />;
    case "lab":
      return <FlaskConicalIcon className="h-4 w-4" />;
    default:
      return null;
  }
}
