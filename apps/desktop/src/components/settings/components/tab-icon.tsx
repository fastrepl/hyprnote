import {
  AudioLinesIcon,
  BellIcon,
  BlocksIcon,
  CalendarIcon,
  CreditCardIcon,
  LayoutTemplateIcon,
  MessageSquareIcon,
  SettingsIcon,
  SparklesIcon,
} from "lucide-react";

import { type Tab } from "./types";

export function TabIcon({ tab }: { tab: Tab }) {
  switch (tab) {
    case "general":
      return <SettingsIcon className="h-4 w-4" />;
    case "notifications":
      return <BellIcon className="h-4 w-4" />;
    case "sound":
      return <AudioLinesIcon className="h-4 w-4" />;
    case "feedback":
      return <MessageSquareIcon className="h-4 w-4" />;
    case "ai":
      return <SparklesIcon className="h-4 w-4" />;
    case "calendar":
      return <CalendarIcon className="h-4 w-4" />;
    case "templates":
      return <LayoutTemplateIcon className="h-4 w-4" />;
    case "integrations":
      return <BlocksIcon className="h-4 w-4" />;
    case "billing":
      return <CreditCardIcon className="h-4 w-4" />;
    default:
      return null;
  }
}
