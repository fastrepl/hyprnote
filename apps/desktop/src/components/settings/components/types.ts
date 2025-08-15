import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BlocksIcon,
  Calendar,
  CreditCard,
  LayoutTemplate,
  MessageSquare,
  NetworkIcon,
  Settings,
  Sparkles,
  Volume2,
} from "lucide-react";

export type Tab =
  | "general"
  | "calendar"
  | "ai-llm"
  | "ai-stt"
  | "notifications"
  | "sound"
  | "templates"
  | "feedback"
  | "integrations"
  | "mcp"
  | "billing";

export const TABS: { name: Tab; icon: LucideIcon }[] = [
  { name: "general", icon: Settings },
  { name: "calendar", icon: Calendar },
  { name: "ai-llm", icon: Sparkles },
  { name: "ai-stt", icon: Sparkles },
  { name: "notifications", icon: Bell },
  { name: "sound", icon: Volume2 },
  { name: "templates", icon: LayoutTemplate },
  { name: "integrations", icon: MessageSquare },
  { name: "mcp", icon: NetworkIcon },
  { name: "billing", icon: CreditCard },
  { name: "feedback", icon: BlocksIcon },
];
