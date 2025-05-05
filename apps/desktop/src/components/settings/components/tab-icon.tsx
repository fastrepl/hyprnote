import {
  AudioLinesIcon,
  BellIcon,
  BlocksIcon,
  CalendarIcon,
  FlaskConicalIcon,
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
    case "extensions":
      return <BlocksIcon size={16} />;
    case "lab":
      return <FlaskConicalIcon size={16} />;
    case "feedback":
      return <MessageSquareIcon size={16} />;
    case "ai":
      return <SparklesIcon className="h-4 w-4" />;
    case "calendar":
      return <CalendarIcon className="h-4 w-4" />;
    default:
      return null;
  }
}
