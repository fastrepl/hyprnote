import {
  AudioLinesIcon,
  BellIcon,
  BlocksIcon,
  FlaskConicalIcon,
  // CalendarIcon,
  // CreditCardIcon,
  // FileTextIcon,
  // FlaskConicalIcon,
  SettingsIcon,
  SparklesIcon,
  // UsersIcon,
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
    case "extensions":
      return <BlocksIcon className="h-4 w-4" />;
    case "lab":
      return <FlaskConicalIcon className="h-4 w-4" />;
    case "ai":
      return <SparklesIcon className="h-4 w-4" />;
    default:
      return null;
  }
}
