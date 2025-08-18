import {
  AudioLinesIcon,
  BellIcon,
  BirdIcon,
  BlocksIcon,
  CalendarIcon,
  CreditCardIcon,
  LayoutTemplateIcon,
  MessageSquareIcon,
  SettingsIcon,
  SparklesIcon,
} from "lucide-react";

import { type Tab } from "./types";

function McpIcon({ className }: { className?: string }) {
  return (
    <svg
      fill="currentColor"
      fillRule="evenodd"
      height="1em"
      width="1em"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M15.688 2.343a2.588 2.588 0 00-3.61 0l-9.626 9.44a.863.863 0 01-1.203 0 .823.823 0 010-1.18l9.626-9.44a4.313 4.313 0 016.016 0 4.116 4.116 0 011.204 3.54 4.3 4.3 0 013.609 1.18l.05.05a4.115 4.115 0 010 5.9l-8.706 8.537a.274.274 0 000 .393l1.788 1.754a.823.823 0 010 1.18.863.863 0 01-1.203 0l-1.788-1.753a1.92 1.92 0 010-2.754l8.706-8.538a2.47 2.47 0 000-3.54l-.05-.049a2.588 2.588 0 00-3.607-.003l-7.172 7.034-.002.002-.098.097a.863.863 0 01-1.204 0 .823.823 0 010-1.18l7.273-7.133a2.47 2.47 0 00-.003-3.537z">
      </path>
      <path d="M14.485 4.703a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a4.115 4.115 0 000 5.9 4.314 4.314 0 006.016 0l7.12-6.982a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a2.588 2.588 0 01-3.61 0 2.47 2.47 0 010-3.54l7.12-6.982z">
      </path>
    </svg>
  );
}

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
    case "ai-llm":
      return <SparklesIcon className="h-4 w-4" />;
    case "ai-stt":
      return <BirdIcon className="h-4 w-4" />;
    case "calendar":
      return <CalendarIcon className="h-4 w-4" />;
    case "templates":
      return <LayoutTemplateIcon className="h-4 w-4" />;
    case "integrations":
      return <BlocksIcon className="h-4 w-4" />;
    case "billing":
      return <CreditCardIcon className="h-4 w-4" />;
    case "mcp":
      return <McpIcon className="h-4 w-4" />;
    default:
      return null;
  }
}
